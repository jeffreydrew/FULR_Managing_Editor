PropertiesService.getScriptProperties().setProperty('EDEN_API_KEY', 'YOUR_KEY');

PropertiesService.getScriptProperties().setProperty('SLACK_BOT_TOKEN', 'YOUR_KEY');

PropertiesService.getScriptProperties().setProperty('COURTLISTENER_API_KEY', 'YOUR_KEY');

PropertiesService.getScriptProperties().setProperty('COURTLISTENER_API_URL', 'https://www.courtlistener.com/api/rest/v3/search/');

function incrementSlashCommandCount() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Sheet1');
  var range = sheet.getRange('M2');
  var currentValue = range.getValue();
  
  if (!currentValue || isNaN(currentValue)) {
    currentValue = 0;
  }
  
  range.setValue(currentValue + 1);
}

function doPost(e) {
  var responseUrl;
  try {
    // Log the raw POST data
    Logger.log("Raw POST data: " + e.postData.contents);

    var payload;

    // Determine if the incoming request is JSON or URL-encoded form data
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (error) {
      payload = e.parameter;
    }

    // Handle Slack URL verification challenge
    if (payload.type === "url_verification") {
      return ContentService.createTextOutput(payload.challenge);
    }

    // Handle event callbacks
    if (payload.type === "event_callback") {
      var event = payload.event;

      // Check the event type
      if (event.type === "app_mention") {
        // handleAppMention(event);
        return ContentService.createTextOutput("OK");
      }
    }

    // Handle slash commands
    if (payload.command) {
      var command = payload.command;
      var text = payload.text;
      responseUrl = payload.response_url;
      var userId = payload.user_id;
      var invokingUserName = getUserFullName(userId);
      var invokingUser = invokingUserName.split(' ')[0]; // Extract the first name



      // Log the extracted parameters
      Logger.log("Command: " + command);
      Logger.log("Text: " + text);
      incrementSlashCommandCount()

      // Acknowledge the command immediately to prevent timeout
      UrlFetchApp.fetch(responseUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ text: 'Processing your request...' })
      });

      // Handle the command using a switch statement
      switch (command) {
        case "/add-editor":
          handleAddEditorCommand(text, responseUrl, payload, invokingUser);
          break;
        case "/writers-for":
          handleGetWritersCommand(text, responseUrl);
          break;
        case "/editor-for":
          handleGetEditorForWriterCommand(text, responseUrl);
          break;
        case "/add-completion-date":
          handleAddCompletionDateCommand(text, responseUrl);
          break;
        case "/meet":
          handleMeetCommand(text, responseUrl, invokingUser);
          break;
        case "/need-checkin":
          handleNeedCheckinCommand(responseUrl);
          break;
        case "/brief-me":
          handleBriefMeCommand(text, responseUrl, payload, invokingUser);
          break;
        case "/guide":
          handleGuideCommand(text, responseUrl, payload, invokingUser);
          break;
        case "/caselaw":
          handleCaselawCommand(text, responseUrl, payload, invokingUser);
          break;
        case "/update-status":
          handleUpdateStatusCommand(text, responseUrl, payload, invokingUser);
          break;
        case "/get-status":
          handleGetStatusCommand(text, responseUrl);
          break;
        case "/list-writers":
          handleListWritersCommand(responseUrl);
          break;
        case "/help":
          handleHelpCommand(responseUrl);
          break;
        default:
          throw new Error("Unknown command: " + command);
      }
      return ContentService.createTextOutput("");
    }

    // If none of the above, return an error
    return ContentService.createTextOutput("No valid command or event type found.");
  } catch (error) {
    Logger.log("Error: " + error.message);
    if (responseUrl) {
      postToSlack(responseUrl, "Error: " + error.message);
    }
    return ContentService.createTextOutput("Error: " + error.message);
  }
}

function handleAppMention(event) {
  try {
    // Extract the user and channel from the event
    var user = event.user;
    var channel = event.channel;
    var text = event.text;

    // Remove the bot mention part from the text
    var mention = `<@${event.bot_id || event.user}>`;
    var messageText = text.replace(mention, '').trim();


    var message = getSummaryFromEdenAI(messageText, "chat");

    // Post the message to Slack
    postMessageToChannel(channel, message);
  } catch (error) {
    Logger.log("Error in handleAppMention: " + error.message);
  }
}


function handleHelpCommand(responseUrl) {
  try {
    var helpMessage = 
      `Available Commands:
      1. /add-editor name: editor - Assign an editor to a writer.
      2. /writers-for editor - List all writers assigned to a specific editor.
      3. /editor-for writer - Get the editor assigned to a specific writer.
      4. /add-completion - date name date - Add a completion date for a writer.
      5. /meet username date - Send a meeting request to a user.
      6. /need-checkin - List users needing check-in.
      7. /brief-me writer - Get a brief summary of the latest proposal for a writer.
      8. /guide prompt - Create a timeline for a paper.
      9. /caselaw prompt - Provide links to legal resources.
      10. /update-status - Update the status of a writer (is shared with channel).
      11. /get-status - Get the status of a writer.
      12. /list-writers - List all writers (and status) by editor
      13. /help - List all available commands.
  Full Documentation available at: 
  https://jeffreydrew.github.io/FULR_Managing_Editor/
      `;

    // Respond with the help message
    postToSlack(responseUrl, helpMessage);
  } catch (error) {
    Logger.log("Error in handleHelpCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
  }
}

function handleAddEditorCommand(text, responseUrl, payload, invokingUser) {
  try {
    // Parse the message for the name format "name: name"
    var nameParts = text.split(':');
    if (nameParts.length !== 2) {
      throw new Error("Invalid message format. Expected format: 'name: name'");
    }

    var fullName = nameParts[0].trim();
    var editorName = nameParts[1].trim();

    // Log the parsed names
    Logger.log("Full name: " + fullName);
    Logger.log("Editor name: " + editorName);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');

    // Find the row with the Full name
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();
    var fullNameColumnIndex = values[0].indexOf("Full Name");
    var editorColumnIndex = values[0].indexOf("Editor");

    if (fullNameColumnIndex === -1 || editorColumnIndex === -1) {
      throw new Error("Columns 'Full Name' and 'Editor' must exist in the sheet.");
    }

    var rowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (values[i][fullNameColumnIndex] === fullName) {
        rowIndex = i + 1;  // Sheet rows are 1-based
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error("Full name '" + fullName + "' not found in the sheet.");
    }

    // Add the editor name to the corresponding row
    sheet.getRange(rowIndex, editorColumnIndex + 1).setValue(editorName);

    // Respond in the same Slack channel
    postMessageToChannel(payload.channel_id, `*${editorName}* (editor) has been assigned to *${fullName}* (writer)`);
    
    // Send a private message to the editor
    sendPrivateMessage(editorName, `You have been assigned as the editor for *${fullName}* (writer)`);

  } catch (error) {
    Logger.log("Error in handleAddEditorCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
  }
}

function handleGetWritersCommand(editorName, responseUrl) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');

    // Find the rows with the given editor name
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();
    var fullNameColumnIndex = values[0].indexOf("Full Name");
    var editorColumnIndex = values[0].indexOf("Editor");

    if (fullNameColumnIndex === -1 || editorColumnIndex === -1) {
      throw new Error("Columns 'Full Name' and 'Editor' must exist in the sheet.");
    }

    var writers = [];
    for (var i = 1; i < values.length; i++) {
      if (values[i][editorColumnIndex] === editorName) {
        writers.push(values[i][fullNameColumnIndex]);
      }
    }

    if (writers.length === 0) {
      return ContentService.createTextOutput("No writers found for editor '" + editorName + "'.");
    }

    // Respond in the same Slack channel
    postToSlack(responseUrl, `Writers assigned to ${editorName}: ${writers.join(', ')}`);

    return ContentService.createTextOutput("Writers list sent for " + editorName);
  } catch (error) {
    Logger.log("Error in handleGetWritersCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
    return ContentService.createTextOutput("Error: " + error.message);
  }
}

function handleGetEditorForWriterCommand(writerName, responseUrl) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');

    // Find the writer and their corresponding editor
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();
    var writerColumnIndex = values[0].indexOf("Full Name");
    var editorColumnIndex = values[0].indexOf("Editor");

    if (writerColumnIndex === -1 || editorColumnIndex === -1) {
      throw new Error("Columns 'Full Name' and 'Editor' must exist in the sheet.");
    }

    var editorName = null;
    for (var i = 1; i < values.length; i++) {
      if (values[i][writerColumnIndex] === writerName) {
        editorName = values[i][editorColumnIndex];
        break;
      }
    }

    if (!editorName) {
      throw new Error("No editor found for writer '" + writerName + "'.");
    }

    postToSlack(responseUrl,`Editor for ${writerName}: ${editorName}`);
  } catch (error) {
    Logger.log("Error in getEditorForWriter: " + error.message);
    throw new Error("Failed to get editor for writer: " + error.message);
  }
}

function handleAddCompletionDateCommand(text, responseUrl) {
  try {
    // Parse the message for the name format "name: name"
    var nameParts = text.split(':');
    if (nameParts.length !== 2) {
      throw new Error("Invalid message format. Expected format: 'Name: Date'");
    }

    var fullName = nameParts[0].trim();
    var date = nameParts[1].trim();

    // Log the parsed names
    Logger.log("Full name: " + fullName);
    Logger.log("Completion Date: " + date);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');

    // Find the row with the Full name
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();
    var fullNameColumnIndex = values[0].indexOf("Full Name");
    var dateColumnIndex = values[0].indexOf("Completion Date");

    if (fullNameColumnIndex === -1 || dateColumnIndex === -1) {
      throw new Error("Columns 'Full Name' and 'Completion Date' must exist in the sheet.");
    }

    var rowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (values[i][fullNameColumnIndex] === fullName) {
        rowIndex = i + 1;  // Sheet rows are 1-based
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error("Full name '" + fullName + "' not found in the sheet.");
    }

    // Add the date to the corresponding row
    sheet.getRange(rowIndex, dateColumnIndex + 1).setValue(date);

    // Respond in the same Slack channel
    postToSlack(responseUrl, `Completion date added for ${fullName}: ${date}`);
  } catch (error) {
    Logger.log("Error in handleAddCompletionDateCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
  }
}

function handleMeetCommand(text, responseUrl, invokingUser) {
  try {
    // Parse the message for the format "username: date"
    var nameDateParts = text.split(':');
    if (nameDateParts.length < 2) {
      throw new Error("Invalid message format. Expected format: 'username: date'");
    }

    var username = nameDateParts[0].trim();
    var date = nameDateParts.slice(1).join(' ').trim();

    // Log the parsed username and date
    Logger.log("Username: " + username);
    Logger.log("Date: " + date);

    // Extract the first name of the recipient
    var recipientFirstName = username.split(' ')[0];

    // Send a private message to the specified username
    var message = `Hi ${recipientFirstName}, I'm ${invokingUser}, an editor with FULR, and I'm super excited to be working with you this semester! Would you be free to meet on ${date} to write out a rough outline for your piece?`;
    sendPrivateMessage(username, message);

    // Respond in the same Slack channel
    postToSlack(responseUrl, `Meeting request sent to ${username} for ${date}`);

    return ContentService.createTextOutput("Meeting request sent");
  } catch (error) {
    Logger.log("Error in handleMeetCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
    return ContentService.createTextOutput("Error: " + error.message);
  }
}

function handleNeedCheckinCommand(responseUrl) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');
    
    // Get all data from the sheet
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();
    
    // Find the index of the "Last Checkin" column
    var lastCheckinColumnIndex = values[0].indexOf("Last Checkin");
    if (lastCheckinColumnIndex === -1) {
      throw new Error("Column 'Last Checkin' must exist in the sheet.");
    }

    // Get the current date and the date two weeks ago
    var today = new Date();
    var twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(today.getDate() - 14);

    // Array to store users with old check-ins
    var usersWithOldCheckins = [];
    
    // Iterate through the rows and find users with last check-in dates older than two weeks
    for (var i = 1; i < values.length; i++) {
      var checkinDate = new Date(values[i][lastCheckinColumnIndex]);
      if (checkinDate < twoWeeksAgo) {
        usersWithOldCheckins.push({
          name: values[i][1], // Assuming the first column is the user name
          date: checkinDate.toDateString()
        });
      }
    }

    // Sort the users by check-in date from oldest to most recent
    usersWithOldCheckins.sort(function(a, b) {
      return new Date(a.date) - new Date(b.date);
    });

    // Create a formatted list of users
    var userListString = usersWithOldCheckins.map(function(user) {
      return `${user.name}: ${user.date}`;
    }).join("\n");

    // Post the list to Slack
    postToSlack(responseUrl, `Users needing check-in:\n${userListString}`);
  } catch (error) {
    Logger.log("Error in handleNeedCheckinCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
  }
}

function handleBriefMeCommand(writerName, responseUrl, payload, invokingUser) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');

    // Find the latest entry for the writer in the Proposal column
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();
    var writerColumnIndex = values[0].indexOf("Full Name");
    var proposalColumnIndex = values[0].indexOf("Proposal");

    if (writerColumnIndex === -1 || proposalColumnIndex === -1) {
      throw new Error("Columns 'Full Name' and 'Proposal' must exist in the sheet.");
    }

    var latestProposal = null;
    for (var i = values.length - 1; i > 0; i--) {
      if (values[i][writerColumnIndex] === writerName) {
        latestProposal = values[i][proposalColumnIndex];
        break;
      }
    }

    if (!latestProposal) {
      throw new Error("No proposal found for writer '" + writerName + "'.");
    }

    // Use Eden AI to get a summary of the proposal
    var summary = getSummaryFromEdenAI(latestProposal, "brief");

    // Respond in the same Slack channel
    // postToSlack(responseUrl, `Brief for ${writerName}'s latest proposal: ${summary}`);
    postMessageToChannel(payload.channel_id, `${invokingUser} requested a brief for *${writerName}*'s latest proposal, here's what I can provide: \n${summary}`)
  } catch (error) {
    Logger.log("Error in handleBriefMeCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
  }
}

function handleGuideCommand(writerName, responseUrl, payload, invokingUser) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');

    // Find the latest entry for the writer in the Proposal column
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();
    var writerColumnIndex = values[0].indexOf("Full Name");
    var proposalColumnIndex = values[0].indexOf("Proposal");

    if (writerColumnIndex === -1 || proposalColumnIndex === -1) {
      throw new Error("Columns 'Full Name' and 'Proposal' must exist in the sheet.");
    }

    var latestProposal = null;
    for (var i = values.length - 1; i > 0; i--) {
      if (values[i][writerColumnIndex] === writerName) {
        latestProposal = values[i][proposalColumnIndex];
        break;
      }
    }

    if (!latestProposal) {
      throw new Error("No proposal found for writer '" + writerName + "'.");
    }

    // Use Eden AI to get a summary of the proposal
    var summary = getSummaryFromEdenAI(latestProposal, "guide");

    // Respond in the same Slack channel
    postMessageToChannel(payload.channel_id, `${invokingUser} requested a timeline for ${writerName}'s proposal completion: \n${summary}`)
  } catch (error) {
    Logger.log("Error in handleBriefMeCommand: " + error.message);
    // postToSlack(responseUrl, "Error: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);

  }
}

function handleCaselawCommand(writerName, responseUrl, payload, invokingUser) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');

    // Find the latest entry for the writer in the Proposal column
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();
    var writerColumnIndex = values[0].indexOf("Full Name");
    var proposalColumnIndex = values[0].indexOf("Proposal");

    if (writerColumnIndex === -1 || proposalColumnIndex === -1) {
      throw new Error("Columns 'Full Name' and 'Proposal' must exist in the sheet.");
    }

    var latestProposal = null;
    for (var i = values.length - 1; i > 0; i--) {
      if (values[i][writerColumnIndex] === writerName) {
        latestProposal = values[i][proposalColumnIndex];
        break;
      }
    }

    if (!latestProposal) {
      throw new Error("No proposal found for writer '" + writerName + "'.");
    }

    // Use Eden AI to get a list of key words and phrases from the proposal
    var summary = getSummaryFromEdenAI(latestProposal, "caselaw");
    var cases = searchCasesByKeywords(summary)
    let output = "";
    cases.forEach(caseItem => {
        output += `Case Name: ${caseItem.caseName}\n`;
        output += `Ruling Date: ${caseItem.rulingDate}\n`;
        output += `Court: ${caseItem.court}\n`;
        output += `Snippet: ${caseItem.snippet}\n`;
        output += '-------------------------------------\n';
    });


    // Respond in the same Slack channel
    postToSlack(responseUrl, `${invokingUser} requested a list of legal resources for *${writerName}*'s latest proposal: \n${output}`);
    // postMessageToChannel(payload.channel_id, `${invokingUser} requested a list of legal resources for ${writerName}'s latest proposal: ${summary}`)

  } catch (error) {
    Logger.log("Error in handleBriefMeCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
  }
}

function handleUpdateStatusCommand(text, responseUrl, payload, invokingUser) {
  try {
    // Parse the message for the format "writer: status"
    var nameStatusParts = text.split(':');
    if (nameStatusParts.length < 2) {
      throw new Error("Invalid message format. Expected format: 'writer: status'");
    }

    var writerName = nameStatusParts[0].trim();
    var status = nameStatusParts.slice(1).join(' ').trim();

    // Log the parsed writer name and status
    Logger.log("Writer: " + writerName);
    Logger.log("Status: " + status);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');

    // Find the row for the writer
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();
    var writerColumnIndex = values[0].indexOf("Full Name");
    var statusColumnIndex = values[0].indexOf("Status");

    if (writerColumnIndex === -1 || statusColumnIndex === -1) {
      throw new Error("Columns 'Full Name' and 'Status' must exist in the sheet.");
    }

    var rowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (values[i][writerColumnIndex] === writerName) {
        rowIndex = i + 1; // Sheet rows are 1-based
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error("Writer '" + writerName + "' not found in the sheet.");
    }

    // Update the status
    sheet.getRange(rowIndex, statusColumnIndex + 1).setValue(status);

    // Respond in the same Slack channel
    postMessageToChannel(payload.channel_id, `Status updated for *${writerName}*: ${status}`);

    return ContentService.createTextOutput("Status updated");
  } catch (error) {
    Logger.log("Error in handleUpdateStatusCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
    return ContentService.createTextOutput("Error: " + error.message);
  }
}

function handleGetStatusCommand(writerName, responseUrl) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');

    // Find the row for the writer
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();
    var writerColumnIndex = values[0].indexOf("Full Name");
    var statusColumnIndex = values[0].indexOf("Status");

    if (writerColumnIndex === -1 || statusColumnIndex === -1) {
      throw new Error("Columns 'Full Name' and 'Status' must exist in the sheet.");
    }

    var status = null;
    for (var i = 1; i < values.length; i++) {
      if (values[i][writerColumnIndex] === writerName) {
        status = values[i][statusColumnIndex];
        break;
      }
    }

    if (!status) {
      throw new Error("Status not found for writer '" + writerName + "'.");
    }

    // Respond in the same Slack channel
    postToSlack(responseUrl, `Status for *${writerName}*: ${status}`);

    return ContentService.createTextOutput("Status retrieved");
  } catch (error) {
    Logger.log("Error in handleGetStatusCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
    return ContentService.createTextOutput("Error: " + error.message);
  }
}

function handleListWritersCommand(responseUrl) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sheet1');

    // Get all data from the sheet
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();
    var writerColumnIndex = values[0].indexOf("Full Name");
    var editorColumnIndex = values[0].indexOf("Editor");
    var statusColumnIndex = values[0].indexOf("Status");

    if (writerColumnIndex === -1 || editorColumnIndex === -1 || statusColumnIndex === -1) {
      throw new Error("Columns 'Full Name', 'Editor', and 'Status' must exist in the sheet.");
    }

    var editors = {};
    for (var i = 1; i < values.length; i++) {
      var editor = values[i][editorColumnIndex];
      var writer = values[i][writerColumnIndex];
      var status = values[i][statusColumnIndex];
      if (editor in editors) {
        editors[editor].push({writer: writer, status: status});
      } else {
        editors[editor] = [{writer: writer, status: status}];
      }
    }

    var message = "All editors and writers:\n";
    for (var editor in editors) {
      message += `*${editor}*\n`;
      editors[editor].forEach(writerStatus => {
        message += `  - ${writerStatus.writer} (Status: ${writerStatus.status})\n`;
      });
    }

    // Respond in the same Slack channel
    postToSlack(responseUrl, message);

    return ContentService.createTextOutput("Writers listed");
  } catch (error) {
    Logger.log("Error in handleListWritersCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
    return ContentService.createTextOutput("Error: " + error.message);
  }
}


//HELPERS

function searchCasesByKeywords(keywords) {
    var courtlistener_api = PropertiesService.getScriptProperties().getProperty('COURTLISTENER_API_KEY');
    var courtlistener_url = PropertiesService.getScriptProperties().getProperty('COURTLISTENER_API_URL');

    const keywordsList = keywords.split(",").map(item => item.trim());


    const query = keywordsList.map(keyword => `q=${encodeURIComponent(keyword)}`).join("&");
    const searchUrl = `${courtlistener_url}?${query}`;

    try {
        const response = UrlFetchApp.fetch(searchUrl, {
            method: "get",
            headers: {
                Authorization: `Token ${courtlistener_api}`,
                "Content-Type": "application/json",
            },
        });

        if (response.getResponseCode() !== 200) {
            throw new Error(`HTTP error! Status: ${response.getResponseCode()}`);
        }

        const data = JSON.parse(response.getContentText());
        const cases = data.results.map((caseItem) => ({
            caseName: caseItem.caseName,
            rulingDate: caseItem.dateFiled,
            court: caseItem.court,
            snippet: caseItem.snippet
        }));
        return cases;
    } catch (error) {
        Logger.log("Error: " + error.message);
    }
}

function getSummaryFromEdenAI(proposal, mode) {
  var edenApiKey = PropertiesService.getScriptProperties().getProperty('EDEN_API_KEY');
  var url = 'https://api.edenai.run/v2/text/chat';
  var prompt;
  switch (mode) {
    case "brief":
      prompt = "Briefly explain this topic: ";
      break;
    case "guide":
      prompt = "Create a timeline of completion within the next month for a 1500 word paper with the following prompt: ";
      break;
    case "caselaw":
      prompt = "Extract a short list of key words and phrases, comma delimited, about the following prompt: ";
      break;
    case "chat":
      prompt = ""
      break;
    default:
      throw new Error("Mode not specified");
  }

  var payload = {
    providers: ["openai"],
    text: prompt + proposal
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + edenApiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // Capture full response even in case of error
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var result = JSON.parse(response.getContentText());

    Logger.log("Eden AI Response Code: " + responseCode);
    Logger.log("Eden AI Response: " + JSON.stringify(result));

    if (responseCode !== 200) {
      throw new Error("Eden AI request failed with status: " + responseCode + ", response: " + response.getContentText());
    }

    // Extract the summary from the result
    var summary = result['openai']['generated_text'];
    return summary;

  } catch (error) {
    Logger.log("Error in getSummaryFromEdenAI: " + error.message);
    throw new Error("Eden AI summarization failed: " + error.message);
  }
}

function sendPrivateMessage(username, message) {
  var token = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');

  // Get user info by username
  var userResponse = UrlFetchApp.fetch('https://slack.com/api/users.list', {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });
  var userList = JSON.parse(userResponse.getContentText()); // parse JSON response

  if (!userList.ok) {
    throw new Error("Could not retrieve user list: " + userList.error);
  }

  var members = userList.members;
  var user = members.find(member => member.profile.real_name === username);
  
  if (!user) {
    throw new Error("Could not find user: " + username);
  }

  var userId = user.id;
  var url = 'https://slack.com/api/chat.postMessage';
  var payload = {
    channel: userId,
    text: message
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify(payload)
  };

  var response = UrlFetchApp.fetch(url, options);
  Logger.log("Slack API response: " + response.getContentText());
}

function getUserFullName(userId) {
  var token = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  var url = 'https://slack.com/api/users.info?user=' + userId;
  
  var options = {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };

  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());

  if (!result.ok) {
    throw new Error("Could not retrieve user info: " + result.error);
  }

  return result.user.profile.real_name;
}

function postMessageToChannel(channel, message) {
  var token = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  var url = 'https://slack.com/api/chat.postMessage';
  var payload = {
    channel: channel,
    text: message
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify(payload)
  };

  var response = UrlFetchApp.fetch(url, options);
  Logger.log("Slack API response: " + response.getContentText());

  if (response.getResponseCode() !== 200) {
    throw new Error("Slack API request failed with status: " + response.getResponseCode());
  }
}

function postToSlack(responseUrl, message) {
  var payload = {
    text: message
  };
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  
  var response = UrlFetchApp.fetch(responseUrl, options);
  Logger.log("Slack API response: " + response.getContentText());

  if (response.getResponseCode() !== 200) {
    throw new Error("Slack API request failed with status: " + response.getResponseCode());
  }
}

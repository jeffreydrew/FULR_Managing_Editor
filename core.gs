PropertiesService.getScriptProperties().setProperty('EDEN_API_KEY', '[YOUR_EDEN_API_KEY');

function doPost(e) {
  var responseUrl;
  try {
    // Log the raw POST data
    Logger.log("Raw POST data: " + e.postData.contents);

    // Parse the URL-encoded POST data
    var params = e.parameter;

    // Handle Slack URL verification challenge
    if (params.type === "url_verification") {
      return ContentService.createTextOutput(params.challenge);
    }

    // Extract the necessary parameters
    var command = params.command;  // The slash command
    var text = params.text;  // The text content of the slash command
    responseUrl = params.response_url;  // The response URL to reply to the command
    
    // Log the extracted parameters
    Logger.log("Command: " + command);
    Logger.log("Text: " + text);

    // Acknowledge the command immediately to prevent timeout
    UrlFetchApp.fetch(responseUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ text: 'Processing your request...' })
    });

    // Handle the command
    if (command === "/add-editor") {
      handleAddEditorCommand(text, responseUrl);
    } else if (command === "/writers-for") {
      handleGetWritersCommand(text, responseUrl);
    } else if (command === "/meet") {
      handleMeetCommand(text, responseUrl);
    } else if (command === "/brief-me") {
      handleBriefMeCommand(text, responseUrl);
    } else if (command === "/guide") {
      handleGuideCommand(text, responseUrl);
    } else if (command === "/caselaw") {
      handleCaselawCommand(text, responseUrl);
    } else if (command === "/editor-for") {
      handleGetEditorForWriterCommand(text, responseUrl);
    } else if (command === "/need-checkin") {
      handleGetUsersWhoNeedCheckinsCommand(text, responseUrl);
    } else if (command === "/add-completion-date") {
      handleAddCompletionDateCommand(text, responseUrl);
    } else {
      throw new Error("Unknown command: " + command);
    }
  } catch (error) {
    Logger.log("Error: " + error.message);
    if (responseUrl) {
      postToSlack(responseUrl, "Error: " + error.message);
    }
  }
  return ContentService.createTextOutput("OK");
}

function handleAddEditorCommand(text, responseUrl) {
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
    postToSlack(responseUrl, `Editor added for ${fullName}: ${editorName}`);
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

function handleGetEditorForWriterCommand(writerName) {
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

    return editorName;
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

function handleGetUsersWhoNeedCheckinsCommand() {
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
          name: values[i][0], // Assuming the first column is the user name
          checkinDate: checkinDate
        });
      }
    }

    // Sort the users by check-in date from oldest to most recent
    usersWithOldCheckins.sort(function(a, b) {
      return a.checkinDate - b.checkinDate;
    });

    // Create a formatted list of users
    var userList = usersWithOldCheckins.map(function(user) {
      return user.name + " (Last Check-in: " + user.checkinDate.toDateString() + ")";
    });

    // Join the list into a single string
    var userListString = userList.join("\n");

    return userListString;
  } catch (error) {
    Logger.log("Error in getUsersWithOldCheckins: " + error.message);
    throw new Error("Failed to get users with old check-ins: " + error.message);
  }
}

function handleMeetCommand(text, responseUrl) {
  try {
    // Parse the message for the format "username date"
    var nameDateParts = text.split(' ');
    if (nameDateParts.length < 2) {
      throw new Error("Invalid message format. Expected format: 'username date'");
    }

    var username = nameDateParts[0].trim();
    var date = nameDateParts.slice(1).join(' ').trim();

    // Log the parsed username and date
    Logger.log("Username: " + username);
    Logger.log("Date: " + date);

    // Send a private message to the specified username
    var message = `Hi, I'm an editor with FULR, and I'm super excited to be working with you this semester! Would you be free to meet on ${date} to write out a rough outline for your piece?`;
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




function handleBriefMeCommand(writerName, responseUrl) {
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
    postToSlack(responseUrl, `Brief for ${writerName}'s latest proposal: ${summary}`);
  } catch (error) {
    Logger.log("Error in handleBriefMeCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
  }
}

function handleGuideCommand(writerName, responseUrl) {
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
    postToSlack(responseUrl, `Guide for ${writerName}'s latest proposal: ${summary}`);
  } catch (error) {
    Logger.log("Error in handleBriefMeCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
  }
}

function handleCaselawCommand(writerName, responseUrl) {
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
    var summary = getSummaryFromEdenAI(latestProposal, "caselaw");

    // Respond in the same Slack channel
    postToSlack(responseUrl, `Legal resources for ${writerName}'s latest proposal: ${summary}`);
  } catch (error) {
    Logger.log("Error in handleBriefMeCommand: " + error.message);
    postToSlack(responseUrl, "Error: " + error.message);
  }
}


function getSummaryFromEdenAI(proposal, mode) {
  var edenApiKey = PropertiesService.getScriptProperties().getProperty('EDEN_API_KEY');
  var url = 'https://api.edenai.run/v2/text/chat';
  if (mode === "brief") {
    var prompt = "Briefly explain this topic: ";
  } else if (mode === "guide") {
    var prompt = "Create a timeline of completion within the next month for a 1500 word paper with the following prompt: ";
  } else if (mode === "caselaw") {
    var prompt = "Provide me with links to legal resources about the following prompt: ";
  } else {
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

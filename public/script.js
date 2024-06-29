// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
    setDoc,
    doc,
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDtMn25l6Fkj3VOGZ-Nt5ZiKXSpMNofyLU",
    authDomain: "fulr-bot.firebaseapp.com",
    projectId: "fulr-bot",
    storageBucket: "fulr-bot.appspot.com",
    messagingSenderId: "921443526060",
    appId: "1:921443526060:web:c68e25e501f52b25414609",
    measurementId: "G-47NQB2HSQ2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");


const signupForm = document.getElementById("signup-form");
signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User signed up:", userCredential.user);
        })
        .catch((error) => {
            console.error("Error signing up:", error);
        });
});

const loginForm = document.getElementById("login-form");
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User logged in:", userCredential.user);
        })
        .catch((error) => {
            console.error("Error logging in:", error);
        });
});

const logoutButton = document.getElementById("logout");
logoutButton.addEventListener("click", () => {
    signOut(auth)
        .then(() => {
            console.log("User logged out");
        })
        .catch((error) => {
            console.error("Error logging out:", error);
        });
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("dashboard").style.display = "block";
    } else {
        document.getElementById("dashboard").style.display = "none";
    }
});

createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        const user = userCredential.user;
        setDoc(doc(db, "users", user.uid), {
            email: user.email,
            createdAt: new Date(),
        });
        console.log("User signed up and added to Firestore:", user);
    })
    .catch((error) => {
        console.error("Error signing up:", error);
    });

// Reference to the form
const contactForm = document.getElementById("contactForm");

// Listen for form submit
contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Get form values
    let name = contactForm["name"].value;
    let email = contactForm["email"].value;
    let message = contactForm["message"].value;

    // Save message to Firestore
    saveMessage(name, email, message);

    // Clear form
    contactForm.reset();
});

// Save message to Firestore
function saveMessage(name, email, message) {
    db.collection("contacts")
        .add({
            name: name,
            email: email,
            message: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => {
            alert("Message sent successfully!");
        })
        .catch((error) => {
            console.error("Error writing document: ", error);
        });
}

// Initialize Firebase Admin SDK
admin.initializeApp();


// Firestore trigger to send email when a new document is created
exports.sendContactEmail = functions.firestore
    .document('contacts/{contactId}')
    .onCreate((snap, context) => {
        const data = snap.data();
        const msg = {
            to: 'jeffreydrew@ufl.edu',
            from: 'bot@fulr.bot',
            subject: `${data.subject}`,
            text: `Name: ${data.name}\nEmail: ${data.email}\nMessage: ${data.message}`,
            html: `<p><strong>Name:</strong> ${data.name}</p>
                   <p><strong>Email:</strong> ${data.email}</p>
                   <p><strong>Message:</strong> ${data.message}</p>`,
        };

        return sgMail.send(msg)
            .then(() => {
                console.log('Email sent successfully');
            })
            .catch((error) => {
                console.error('Error sending email:', error);
            });
    });


//DOCUMENT LOADED---------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    // Smooth scroll for navigation links
    document.querySelectorAll(".navbar ul li a").forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();

            document.querySelector(this.getAttribute("href")).scrollIntoView({
                behavior: "smooth",
            });
        });
    });

    // Copy to clipboard functionality
    document.querySelectorAll(".copy-button").forEach((button) => {
        button.addEventListener("click", function () {
            var codeBlock = this.previousElementSibling;
            var textToCopy = codeBlock.innerText;

            navigator.clipboard
                .writeText(textToCopy)
                .then(() => {
                    this.textContent = "Copied!";
                    this.style.backgroundColor = "#E7F6F2";
                    this.style.color = "#2C3333";

                    setTimeout(() => {
                        this.textContent = "Copy";
                        this.style.backgroundColor = "#A5C9CA";
                        this.style.color = "#2C3333";
                    }, 2000);
                })
                .catch((err) => {
                    console.error("Could not copy text: ", err);
                });
        });
    });
});

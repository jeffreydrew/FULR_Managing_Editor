// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDtMn25l6Fkj3VOGZ-Nt5ZiKXSpMNofyLU",
    authDomain: "fulr-bot.firebaseapp.com",
    databaseURL: "https://fulr-bot-default-rtdb.firebaseio.com",
    projectId: "fulr-bot",
    storageBucket: "fulr-bot.appspot.com",
    messagingSenderId: "921443526060",
    appId: "1:921443526060:web:c68e25e501f52b25414609",
    measurementId: "G-47NQB2HSQ2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore(app);

// Register
document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;

            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    console.log("User registered:", userCredential.user);
                    window.location.href = "login.html";
                })
                .catch((error) => {
                    console.error("Error registering:", error);
                    alert(`Error registering: ${error.message}`);
                });
        });
    }

    // Login
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    console.log("User logged in:", userCredential.user);
                    window.location.href = "dashboard.html";
                })
                .catch((error) => {
                    console.error("Error logging in:", error);
                    alert(`Error logging in: ${error.message}`);
                });
        });
    }

    // Logout
    const logoutButton = document.getElementById("logout");
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            signOut(auth)
                .then(() => {
                    window.location.href = "login.html";
                })
                .catch((error) => {
                    console.error("Error logging out:", error);
                    alert(`Error logging out: ${error.message}`);
                });
        });
    }

    // Redirect to dashboard if already logged in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (
                window.location.pathname === "/login.html" ||
                window.location.pathname === "/register.html"
            ) {
                window.location.href = "dashboard.html";
            }
        } else {
            if (window.location.pathname === "/dashboard.html") {
                window.location.href = "login.html";
            }
        }
    });
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
            console.error("Error writing document:", error);
        });
}

// Reference to the form
const contactForm = document.getElementById("contactForm");

// Listen for form submit
if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = contactForm["name"].value;
        const email = contactForm["email"].value;
        const message = contactForm["message"].value;
        saveMessage(name, email, message);
        contactForm.reset();
    });
}

// Initialize Firebase Admin SDK (used in Firebase Functions, not here)
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Firestore trigger to send email when a new document is created
exports.sendContactEmail = functions.firestore
    .document("contacts/{contactId}")
    .onCreate((snap, context) => {
        const data = snap.data();
        const msg = {
            to: "jeffreydrew@ufl.edu",
            from: "bot@fulr.bot",
            subject: `${data.subject}`,
            text: `Name: ${data.name}\nEmail: ${data.email}\nMessage: ${data.message}`,
            html: `<p><strong>Name:</strong> ${data.name}</p>
                   <p><strong>Email:</strong> ${data.email}</p>
                   <p><strong>Message:</strong> ${data.message}</p>`,
        };

        return sgMail
            .send(msg)
            .then(() => {
                console.log("Email sent successfully");
            })
            .catch((error) => {
                console.error("Error sending email:", error);
            });
    });

// Document loaded event listener
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".navbar ul li a").forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute("href")).scrollIntoView({
                behavior: "smooth",
            });
        });
    });

    document.querySelectorAll(".copy-button").forEach((button) => {
        button.addEventListener("click", function () {
            const codeBlock = this.previousElementSibling;
            const textToCopy = codeBlock.innerText;

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
                    console.error("Could not copy text:", err);
                });
        });
    });
});

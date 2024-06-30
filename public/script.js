import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
    getAuth,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// Helper functions to manage cookies
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0)
            return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name + "=; Max-Age=-99999999;";
}

document.addEventListener("DOMContentLoaded", async () => {
    // Registration
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("register-name").value;
            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;

            try {
                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );
                const user = userCredential.user;

                // Add user to Firestore
                await setDoc(doc(db, "users", user.uid), {
                    name: name,
                    email: user.email,
                    createdAt: new Date(),
                });

                console.log("User added to Firestore:", user.uid);
                window.location.href = "login.html";
            } catch (error) {
                console.error(
                    "Error registering or adding to Firestore:",
                    error
                );
                alert(
                    `Error registering or adding to Firestore: ${error.message}`
                );
            }
        });
    }

    // Login
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            try {
                const userCredential = await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );
                const user = userCredential.user;

                // Store user information in a cookie
                setCookie(
                    "user",
                    JSON.stringify({ uid: user.uid, email: user.email }),
                    1
                );

                console.log("User logged in:", user);
                window.location.href = "dashboard.html";
            } catch (error) {
                console.error("Error logging in:", error);
                alert(`Error logging in: ${error.message}`);
            }
        });
    }

    // Logout
    const logoutButton = document.getElementById("logout");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                await signOut(auth);
                eraseCookie("user");
                window.location.href = "login.html";
            } catch (error) {
                console.error("Error logging out:", error);
                alert(`Error logging out: ${error.message}`);
            }
        });
    }

    // Display user info on dashboard
    if (window.location.pathname === "/dashboard.html") {
        const userCookie = getCookie("user");
        if (userCookie) {
            const userData = JSON.parse(userCookie);
            try {
                const userDoc = await getDoc(doc(db, "users", userData.uid));
                if (userDoc.exists()) {
                    const userInfo = userDoc.data();
                    document.getElementById(
                        "user-info"
                    ).innerText = `${userInfo.name}`;

                    // Dispatch a custom event indicating that user info is updated
                    const event = new CustomEvent("userInfoUpdated", {
                        detail: userInfo.name,
                    });
                    document.dispatchEvent(event);
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error("Error getting user document:", error);
            }
        } else {
            window.location.href = "login.html";
        }
    }
    // Document loaded event listener
    document
        .querySelectorAll(".navbar-documentation ul li a")
        .forEach((anchor) => {
            anchor.addEventListener("click", function (e) {
                e.preventDefault();
                document
                    .querySelector(this.getAttribute("href"))
                    .scrollIntoView({
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

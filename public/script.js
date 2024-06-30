import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
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

document.addEventListener("DOMContentLoaded", () => {
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
                console.log("User logged in:", userCredential.user);
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
                window.location.href = "login.html";
            } catch (error) {
                console.error("Error logging out:", error);
                alert(`Error logging out: ${error.message}`);
            }
        });
    }

    // Display user info on dashboard
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (window.location.pathname === "/dashboard.html") {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        document.getElementById(
                            "user-info"
                        ).innerText = `Hello, ${userData.name}`;
                    } else {
                        console.log("No such document!");
                    }
                } catch (error) {
                    console.error("Error getting user document:", error);
                }
            }
        } else {
            if (window.location.pathname === "/dashboard.html") {
                window.location.href = "login.html";
            }
        }
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

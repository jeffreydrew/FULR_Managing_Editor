
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

import { database } from "./firebase.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const form = document.getElementById("joinForm");
const teamLogoInput = document.getElementById("teamLogo");

form.addEventListener("submit", async function(e){
    e.preventDefault();

    let teamLogo = "";

    if (teamLogoInput.files && teamLogoInput.files[0]) {
        const file = teamLogoInput.files[0];
        teamLogo = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    const player = {
        teamName: document.getElementById("teamName").value.trim(),
        teamLogo,
        teamRegion: document.getElementById("teamRegion").value.trim(),
        managerIgn: document.getElementById("managerIgn").value.trim(),
        managerFullName: document.getElementById("managerFullName").value.trim(),
        totalPlayers: document.getElementById("totalPlayers").value,
        previousOrganization: document.getElementById("previousOrganization").value.trim(),
        tournamentExperience: document.getElementById("tournamentExperience").value,
        bestTournamentResult: document.getElementById("bestTournamentResult").value.trim(),
        preferredPlayTime: document.getElementById("preferredPlayTime").value,
        whatsappContact: document.getElementById("whatsappContact").value.trim(),
        emailAddress: document.getElementById("emailAddress").value.trim(),
        createdAt: new Date().toISOString()
    };

    push(ref(database, "applications"), player)
    .then(() => {
        showSuccessModal("Success", "✅ Application Submitted Successfully!");
        form.reset();
    })
    .catch((error) => {
        showErrorModal("Error", "❌ Error: " + error.message);
    });
});
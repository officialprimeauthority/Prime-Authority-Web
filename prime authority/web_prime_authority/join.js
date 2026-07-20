import { database } from "./firebase.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const IMGBB_API_KEY = "cce75417ebaca6654e3b46911c9e512d";

async function uploadFileToImgbb(file) {
    if (!file) return null;
    const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result?.toString() || '';
            resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
    const formData = new FormData();
    formData.append('image', base64);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'imgbb upload failed');
    return {
        url: data.data.url,
        deleteHash: data.data.delete_hash
    };
}

const form = document.getElementById("joinForm");
const teamLogoInput = document.getElementById("teamLogo");

form.addEventListener("submit", async function(e){
    e.preventDefault();

    let teamLogo = "";
    let teamLogoDeleteHash = "";

    if (teamLogoInput.files && teamLogoInput.files[0]) {
        const file = teamLogoInput.files[0];
        const upload = await uploadFileToImgbb(file);
        teamLogo = upload?.url || '';
        teamLogoDeleteHash = upload?.deleteHash || '';
    }

    const player = {
        teamName: document.getElementById("teamName").value.trim(),
        teamLogo,
        teamLogoDeleteHash,
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
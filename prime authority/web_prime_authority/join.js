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

// Logo preview functionality
if (teamLogoInput) {
    teamLogoInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        const previewContainer = document.getElementById('logoPreviewContainer');
        const preview = document.getElementById('logoPreview');
        const fileName = document.getElementById('logoFileName');

        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                preview.src = event.target.result;
                const fileSizeKB = (file.size / 1024).toFixed(2);
                fileName.textContent = `${file.name} (${fileSizeKB} KB)`;
                previewContainer.style.display = 'block';
                // Scroll to preview if needed
                previewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            };
            reader.readAsDataURL(file);
        } else {
            previewContainer.style.display = 'none';
        }
    });
}

form.addEventListener("submit", async function(e){
    e.preventDefault();

    // Ensure logo is uploaded
    if (!teamLogoInput.files || teamLogoInput.files.length === 0) {
        showErrorModal("Error", "❌ Team logo is required. Please upload your team logo.");
        return;
    }

    let teamLogo = "";
    let teamLogoDeleteHash = "";

    try {
        // Upload logo to imgbb
        if (teamLogoInput.files && teamLogoInput.files[0]) {
            const file = teamLogoInput.files[0];
            console.log("Uploading logo:", file.name, "size:", file.size);
            const upload = await uploadFileToImgbb(file);
            
            if (!upload || !upload.url) {
                showErrorModal("Upload Failed", "❌ Logo upload failed. Please try again.");
                console.error("Logo upload returned null/empty:", upload);
                return;
            }
            
            teamLogo = upload.url;
            teamLogoDeleteHash = upload.deleteHash ?? '';
            console.log("Logo uploaded successfully:", teamLogo, "deleteHash:", teamLogoDeleteHash);
        }

        const player = {
            teamName: document.getElementById("teamName").value.trim(),
            teamLogo,
            teamLogoDeleteHash: teamLogoDeleteHash || '',
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

        console.log("Submitting application with logo URL:", player.teamLogo);
        
        push(ref(database, "applications"), player)
        .then(() => {
            showSuccessModal("Success", "✅ Application Submitted Successfully! Your logo will appear in the admin panel.");
            form.reset();
            document.getElementById('logoPreviewContainer').style.display = 'none';
        })
        .catch((error) => {
            showErrorModal("Error", "❌ Database Error: " + error.message);
            console.error("Firebase push error:", error);
        });
    } catch (error) {
        showErrorModal("Error", "❌ Submission Error: " + error.message);
        console.error("Form submission error:", error);
    }
});
import { database } from "./firebase.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const form = document.getElementById("tournamentForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const teamData = {
        teamName: document.getElementById("teamName").value,
        captainName: document.getElementById("captainName").value,
        captainUID: document.getElementById("captainUID").value,
        captainIGN: document.getElementById("captainIGN").value,

        player2UID: document.getElementById("player2UID").value,
        player2IGN: document.getElementById("player2IGN").value,

        player3UID: document.getElementById("player3UID").value,
        player3IGN: document.getElementById("player3IGN").value,

        player4UID: document.getElementById("player4UID").value,
        player4IGN: document.getElementById("player4IGN").value,

        sub1UID: document.getElementById("sub1UID").value,
        sub1IGN: document.getElementById("sub1IGN").value,

        sub2UID: document.getElementById("sub2UID").value,
        sub2IGN: document.getElementById("sub2IGN").value,

        whatsapp: document.getElementById("whatsapp").value,
        state: document.getElementById("state").value,

        status: "Pending Verification",
        registeredAt: new Date().toLocaleString()
    };

    try{
        await push(ref(database,"tournaments"),teamData);

        showSuccessModal("Success", "🏆 Team Registered Successfully!");

        form.reset();

    }catch(err){

        showErrorModal("Error", "Registration Failed : " + err.message);

    }

});
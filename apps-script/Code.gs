/**
 * RENDEVO — Ophtalmologie
 * Google Apps Script backend for the public booking-request form.
 *
 * Setup:
 * 1) Paste this file into a Google Apps Script project.
 * 2) If the script is NOT bound to the target spreadsheet, set SPREADSHEET_ID below
 *    or add BOOKING_SPREADSHEET_ID in Project Settings > Script properties.
 * 3) Set CLINIC_EMAIL to the clinic's inbox.
 * 4) Set the Apps Script project timezone to Africa/Algiers.
 * 5) Run setupBookingSystem() once, authorize, then Deploy > New deployment > Web app.
 *    Execute as: Me. Who has access: Anyone.
 * 6) Copy the /exec URL into config.js and set bookingEnabled to true only after testing.
 *
 * The website collects appointment REQUESTS (date + time preference), not guaranteed
 * time slots. Confirm appointments manually by changing Status to "Confirmé" in the sheet.
 */

const CONFIG = {
  PRODUCT: "RENDEVO",
  SPECIALTY: "Ophtalmologie",
  CLINIC_NAME: "Cabinet Ophtalmologie",
  CLINIC_EMAIL: "", // REQUIRED: clinic notification inbox
  SPREADSHEET_ID: "", // Optional if this script is bound to the target Google Sheet
  SHEET_NAME: "RendezVous",
  TIMEZONE: "Africa/Algiers",
  REMINDER_HOUR: 8
};

const HEADERS = [
  "Créé le", "Référence", "Spécialité", "Motif", "Précision",
  "Date souhaitée", "Préférence horaire", "Autre date possible",
  "Nom", "Téléphone", "E-mail", "Note secrétariat",
  "Statut", "Consentement", "Fuseau horaire", "Jeton annulation",
  "Rappel envoyé le"
];

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.action === "cancel") {
    const result = cancelRequest_(params.ref, params.token);
    return HtmlService.createHtmlOutput(
      '<main style="font:16px Arial,sans-serif;max-width:560px;margin:12vh auto;padding:28px;color:#26352d">' +
      '<h2>' + (result.success ? "Demande annulée" : "Lien invalide ou déjà utilisé") + '</h2>' +
      '<p>' + escapeHtml_(result.message) + '</p><p>RENDEVO · Ophtalmologie</p></main>'
    ).setTitle("Annulation de rendez-vous");
  }
  return json_({ success: true, service: "RENDEVO Ophtalmologie", message: "Le service de réservation est disponible." });
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw) return json_({ success: false, message: "Aucune donnée reçue." });
    const payload = JSON.parse(raw);
    if (payload.action === "createAppointment") return json_(createAppointment_(payload));
    if (payload.action === "cancelAppointment") return json_(cancelRequest_(payload.reference, payload.token));
    return json_({ success: false, message: "Action non reconnue." });
  } catch (error) {
    console.error(error);
    return json_({ success: false, message: "Une erreur est survenue. Réessayez ou contactez le cabinet." });
  }
}

function setupBookingSystem() {
  const sheet = getSheet_();
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  sheet.autoResizeColumns(1, HEADERS.length);
  installDailyReminderTrigger();
  Logger.log("RENDEVO Ophtalmologie prêt. Feuille: " + sheet.getName());
}

function createAppointment_(p) {
  const required = ["service", "date", "name", "phone"];
  for (let i = 0; i < required.length; i++) {
    if (!String(p[required[i]] || "").trim()) {
      return { success: false, message: "Veuillez compléter les champs obligatoires." };
    }
  }
  if (p.consent !== true) return { success: false, message: "Le consentement est nécessaire pour traiter la demande." };

  const date = String(p.date);
  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) {
    return { success: false, message: "La date souhaitée est invalide." };
  }
  const phone = String(p.phone).trim();
  if (phone.replace(/\D/g, "").length < 8) {
    return { success: false, message: "Le numéro de téléphone semble invalide." };
  }
  const email = String(p.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "L'adresse e-mail semble invalide." };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let ref, token, row;
  try {
    const sheet = getSheet_();
    ref = "OPH-" + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyyMMdd") + "-" + Math.floor(100000 + Math.random() * 900000);
    token = Utilities.getUuid().replace(/-/g, "");
    row = [
      new Date(), ref, CONFIG.SPECIALTY,
      clean_(p.service, 120), clean_(p.otherReason, 120),
      date, clean_(p.timePreference || "Indifférent", 30),
      clean_(p.alternateDate, 20), clean_(p.name, 100),
      phone, email, clean_(p.note, 300),
      "En attente", "Oui", CONFIG.TIMEZONE, token, ""
    ];
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  const cancelUrl = ScriptApp.getService().getUrl() +
    "?action=cancel&ref=" + encodeURIComponent(ref) + "&token=" + encodeURIComponent(token);

  let clinicMailSent = false;
  let patientMailSent = false;
  if (CONFIG.CLINIC_EMAIL) {
    try {
      MailApp.sendEmail({
        to: CONFIG.CLINIC_EMAIL,
        subject: "Nouvelle demande de rendez-vous — " + ref,
        body: clinicEmailText_(row),
        htmlBody: clinicEmailHtml_(row)
      });
      clinicMailSent = true;
    } catch (mailError) {
      console.error("Clinic email failed: " + mailError);
    }
  }
  if (email) {
    try {
      MailApp.sendEmail({
        to: email,
        subject: "Demande reçue — " + CONFIG.CLINIC_NAME,
        body: patientEmailText_(row, cancelUrl),
        htmlBody: patientEmailHtml_(row, cancelUrl)
      });
      patientMailSent = true;
    } catch (mailError) {
      console.error("Patient email failed: " + mailError);
    }
  }

  return {
    success: true,
    reference: ref,
    message: "Votre demande a bien été transmise au cabinet. Le secrétariat vous contactera pour confirmer le rendez-vous."
  };
}

function cancelRequest_(ref, token) {
  if (!ref || !token) return { success: false, message: "Le lien d'annulation est incomplet." };
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]) === String(ref) && String(values[i][15]) === String(token)) {
      if (String(values[i][12]) === "Annulé") {
        return { success: false, message: "Cette demande est déjà annulée." };
      }
      sheet.getRange(i + 1, 13).setValue("Annulé");
      sheet.getRange(i + 1, 17).setValue("");
      const email = String(values[i][10] || "");
      if (email) {
        try {
          MailApp.sendEmail(email, "Annulation enregistrée — " + CONFIG.CLINIC_NAME,
            "Votre demande " + ref + " a été annulée. Si vous souhaitez un autre rendez-vous, contactez le cabinet.");
        } catch (mailError) { console.error(mailError); }
      }
      if (CONFIG.CLINIC_EMAIL) {
        try {
          MailApp.sendEmail(CONFIG.CLINIC_EMAIL, "Demande annulée — " + ref,
            "La demande " + ref + " a été annulée par le patient.");
        } catch (mailError) { console.error(mailError); }
      }
      return { success: true, message: "Votre demande a été annulée. Le cabinet a été informé." };
    }
  }
  return { success: false, message: "Référence ou lien d'annulation invalide." };
}

/**
 * Run once via setupBookingSystem(). Sends a reminder for tomorrow's confirmed
 * appointments. The daily trigger runs at the configured hour in project timezone.
 */
function installDailyReminderTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "sendDailyReminders") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("sendDailyReminders").timeBased().everyDays(1).atHour(CONFIG.REMINDER_HOUR).create();
}

function sendDailyReminders() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = Utilities.formatDate(tomorrow, CONFIG.TIMEZONE, "yyyy-MM-dd");
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const status = String(row[12] || "");
    const appointmentDate = normalizeDate_(row[5]);
    const email = String(row[10] || "");
    const alreadySent = String(row[16] || "");
    if (status !== "Confirmé" || appointmentDate !== target || !email || alreadySent) continue;
    try {
      MailApp.sendEmail(
        email,
        "Rappel de votre rendez-vous — " + CONFIG.CLINIC_NAME,
        "Rappel : votre rendez-vous au " + CONFIG.CLINIC_NAME + " est prévu demain (" + target + "). Préférence horaire enregistrée : " + row[6] + ". Pour toute modification, contactez directement le cabinet."
      );
      sheet.getRange(i + 1, 17).setValue(new Date());
    } catch (mailError) {
      console.error("Reminder failed for " + row[1] + ": " + mailError);
    }
  }
}

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("BOOKING_SPREADSHEET_ID") || CONFIG.SPREADSHEET_ID;
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Associez le script à une feuille Google Sheets ou renseignez BOOKING_SPREADSHEET_ID.");
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(HEADERS);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function normalizeDate_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, CONFIG.TIMEZONE, "yyyy-MM-dd");
  return String(value || "").slice(0, 10);
}

function clean_(value, max) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

function escapeHtml_(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function clinicEmailText_(r) {
  return "Nouvelle demande " + r[1] + "\nMotif : " + r[3] + "\nDate : " + r[5] +
    "\nPréférence : " + r[6] + "\nAutre date : " + (r[7] || "—") +
    "\nNom : " + r[8] + "\nTéléphone : " + r[9] + "\nE-mail : " + (r[10] || "—") +
    "\nNote : " + (r[11] || "—") + "\nStatut : En attente";
}

function clinicEmailHtml_(r) {
  return "<h2>Nouvelle demande de rendez-vous</h2><p><b>Référence :</b> " + escapeHtml_(r[1]) +
    "</p><p><b>Motif :</b> " + escapeHtml_(r[3]) + "</p><p><b>Date :</b> " + escapeHtml_(r[5]) +
    "</p><p><b>Préférence :</b> " + escapeHtml_(r[6]) + "</p><p><b>Patient :</b> " +
    escapeHtml_(r[8]) + "</p><p><b>Téléphone :</b> " + escapeHtml_(r[9]) +
    "</p><p><b>E-mail :</b> " + escapeHtml_(r[10] || "—") + "</p><p><b>Note :</b> " +
    escapeHtml_(r[11] || "—") + "</p><p><b>Statut :</b> En attente</p>";
}

function patientEmailText_(r, cancelUrl) {
  return "Bonjour " + r[8] + ",\n\nNous avons bien reçu votre demande de rendez-vous. Elle n'est pas encore confirmée.\n" +
    "Référence : " + r[1] + "\nMotif : " + r[3] + "\nDate souhaitée : " + r[5] +
    "\nPréférence horaire : " + r[6] + "\n\nLe secrétariat vous contactera pour confirmer le créneau.\n" +
    "Pour annuler cette demande : " + cancelUrl + "\n\n" + CONFIG.CLINIC_NAME;
}

function patientEmailHtml_(r, cancelUrl) {
  return "<p>Bonjour " + escapeHtml_(r[8]) + ",</p><p>Nous avons bien reçu votre demande de rendez-vous. <b>Elle n'est pas encore confirmée.</b></p>" +
    "<p><b>Référence :</b> " + escapeHtml_(r[1]) + "<br><b>Motif :</b> " + escapeHtml_(r[3]) +
    "<br><b>Date souhaitée :</b> " + escapeHtml_(r[5]) + "<br><b>Préférence :</b> " + escapeHtml_(r[6]) +
    "</p><p>Le secrétariat vous contactera pour confirmer le créneau.</p><p><a href=\"" + escapeHtml_(cancelUrl) +
    "\">Annuler cette demande</a></p><p>" + escapeHtml_(CONFIG.CLINIC_NAME) + "</p>";
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

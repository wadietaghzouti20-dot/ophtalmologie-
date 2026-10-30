/* Configuration du cabinet — à personnaliser avant mise en ligne. */
window.RENDEVO_CONFIG = {
  product: "RENDEVO",
  specialty: "ophtalmologie",
  clinicName: "Cabinet Ophtalmologie",
  subtitle: "Prenez soin de votre vision, simplement.",
  phone: "",
  email: "",
  city: "Oran",
  timezone: "Africa/Algiers",
  locale: "fr-DZ",
  currency: "DZD",
  /* Paste the deployed Apps Script /exec URL here when the backend is ready. */
  apiUrl: "https://script.google.com/macros/s/AKfycbwpRSFWtvaX7etrn8xayjvH3dkySzgwUrkp-noxJ5YaZTiPEwzay6W9ZG55Cb7b0Xa5/exec",
  /* Keep false until the backend is deployed and tested. */
  bookingEnabled: true,
  /* Public clinic schedule is informational until the backend confirms availability. */
  schedule: { days: ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Samedi"], note: "Les horaires sont confirmés par le cabinet." },
  services: [["Première consultation ophtalmologique","Première visite ou nouveau motif"],["Contrôle de la vision","Évaluation de la vision"],["Consultation de suivi","Suivi planifié avec l'ophtalmologue"],["Renouvellement ou contrôle de correction","Évaluation et suivi de la correction visuelle"],["Fond d'œil","Demande de rendez-vous — préparation à confirmer"],["Dépistage et contrôle","Consultation préventive"],["Suivi du glaucome","Rendez-vous de suivi"],["Suivi après intervention","Consultation de contrôle"],["Résultats d'examens","Discussion des résultats avec le praticien"],["Autre motif","À préciser brièvement au secrétariat"]]
};
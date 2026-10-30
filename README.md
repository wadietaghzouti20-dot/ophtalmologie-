# RENDEVO — Ophtalmologie

Interface de prise de demande de rendez-vous spécialisée, en français, conçue pour mobile et ordinateur.

## Fichiers du site
- `index.html` — structure accessible et parcours de réservation.
- `styles.css` — identité visuelle dédiée à la spécialité.
- `app.js` — parcours multi-étapes, validation, récapitulatif et intégration API.
- `config.js` — identité du cabinet, motifs et paramètres d'intégration.

## Backend Google Apps Script
Le modèle est disponible dans [apps-script/Code.gs](apps-script/Code.gs).

1. Ouvrir le fichier et copier son contenu dans un projet Google Apps Script.
2. Associer le script à la feuille Google Sheets du cabinet, ou renseigner `BOOKING_SPREADSHEET_ID` dans les Script Properties.
3. Modifier `CONFIG.CLINIC_EMAIL` dans le code avec l'adresse de réception du cabinet.
4. Régler le fuseau horaire du projet sur `Africa/Algiers`.
5. Exécuter `setupBookingSystem()` une fois et autoriser les accès.
6. Déployer en tant que Web App : exécution en tant que propriétaire, accès « Anyone ».
7. Copier l'URL `/exec` dans `config.js` (`apiUrl`), puis mettre `bookingEnabled: true` après les tests.

## Fonctionnement important
Le formulaire collecte une **demande de rendez-vous** avec une date et une préférence horaire (matin / après-midi / indifférent). Il ne réserve pas un créneau horaire précis et ne confirme pas automatiquement un rendez-vous. Le secrétariat confirme le créneau en modifiant le statut de la ligne dans Google Sheets à `Confirmé`.

Le backend :
- enregistre les demandes dans la feuille `RendezVous`;
- envoie un e-mail au cabinet si `CLINIC_EMAIL` est configuré;
- envoie un accusé de réception au patient si son adresse e-mail est fournie;
- fournit un lien d'annulation sécurisé par référence et jeton;
- envoie un rappel quotidien pour les demandes dont le statut est `Confirmé` et dont la date est le lendemain (trigger installé par `setupBookingSystem()`).

Le rappel est quotidien à l'heure définie dans `CONFIG.REMINDER_HOUR` (08:00 par défaut), dans le fuseau du projet. Ce n'est pas une garantie d'envoi exactement 24 heures avant l'heure du rendez-vous.

## Sécurité et confidentialité
Le backend revalide les champs essentiels et le consentement. Ne demandez pas de diagnostic, d'ordonnance ou de résultats médicaux dans le formulaire public. Gardez la feuille Google Sheets privée et ne publiez jamais son identifiant ni les données des patients. Testez les e-mails, l'annulation et les rappels avec des données fictives avant toute utilisation réelle.

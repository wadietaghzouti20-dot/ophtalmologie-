# RENDEVO — Ophtalmologie

Site de réservation en français pour un cabinet d'ophtalmologie, avec créneaux réels, réservation immédiate, prévention des doubles réservations, Google Sheets, Google Calendar, confirmation e-mail, annulation sécurisée et rappel programmé 24 heures avant le rendez-vous.

## Mise à jour Apps Script obligatoire

Le code source du backend est dans [apps-script/Code.gs](./apps-script/Code.gs). Une modification GitHub ne met pas automatiquement à jour le Web App Apps Script.

1. Ouvrir le projet Apps Script qui correspond à l'URL déjà présente dans `config.js`.
2. Remplacer tout le contenu de `Code.gs` par le fichier [apps-script/Code.gs](./apps-script/Code.gs), puis enregistrer.
3. Exécuter `setupBookingSystem()` une fois et autoriser Sheets, Gmail, Calendar et les déclencheurs.
4. Vérifier le journal d'exécution pour l'URL de la feuille.
5. Déployer > Gérer les déploiements > Modifier > Nouvelle version > Déployer. Garder la même URL /exec.
6. Tester une réservation future, la confirmation e-mail, la ligne `Demandes`, Google Calendar, le rappel et l'annulation.

## Horaires de base

- Dimanche à jeudi : 08:00–17:00
- Vendredi : fermé
- Samedi : 10:00–16:00
- Départs de créneaux toutes les 15 minutes; durée selon le motif.

Le rappel est programmé par déclencheur unique à l'heure du rendez-vous moins 24 heures. Google peut toutefois retarder l'exécution d'un déclencheur. Les rendez-vous pris à moins de 24 heures ne peuvent pas recevoir un rappel anticipé de 24 heures.

Utiliser uniquement des données fictives pour les tests. Ne pas collecter de dossiers médicaux ou de détails cliniques sensibles dans ce formulaire.

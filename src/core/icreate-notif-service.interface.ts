/**
 * *~~~~~~~~~~~~~~~~~~~
 * Author: HugoBlanc |
 * *~~~~~~~~~~~~~~~~~~~
 * Cette interface cible l'ensemble des class suscceptible d'envoyer des notifications
 * Ainsi chaque class affecté par l'envoi de notif aura une methode createNotif a partir du supertype T
 * T est donc à définir dans la class en question, ça peut être un post, une vidéo ....
 * *~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 */
export interface IcreateNotifService<T> {
  createNotif(object: T);
}

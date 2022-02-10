const Session = require('./Session');
const dateToString = require('../functions/dateToString');

module.exports = class Eleve {
   /**
    * @constructor
    * @param {Session} session
    * @param {Object} compte
    * @param {Number} compte.id
    * @param {String} compte.prenom
    * @param {String} compte.nom
    * @param {String} compte.sexe
    * @param {String} compte.photo
    * @param {Object} compte.classe
    * @param {Number} compte.classe.id
    * @param {String} compte.classe.libelle
    * @param {Object} compte.profile
    * @param {String} compte.profile.sexe
    * @param {String} compte.profile.photo
    * @param {Object} compte.profile.classe
    * @param {Number} compte.profile.classe.id
    * @param {String} compte.profile.classe.libelle
    */
   constructor(session, compte) {
      const { id, prenom, nom, sexe, photo, classe, profile } = compte;

      this.session = session;
      this.id = id;
      this.prenom = prenom;
      this.nom = nom;
      this.sexe = sexe || profile?.sexe;
      this.photo = photo || profile?.photo;
      this.classe = classe
         ? { nom: classe.libelle, id: classe.id }
         : { nom: profile?.classe?.libelle, id: profile?.classe?.id };
   }

   /**
    * @returns {Promise}
    */
   fetchVieScolaire() {
      return new Promise((resolve, reject) => {
         this.session
            .request(`/eleves/${this.id}/viescolaire.awp?verbe=get`)
            .then(data => resolve(data))
            .catch(err => reject(err));
      });
   }

   /**
    * @returns {Promise}
    */
   fetchVieDeClasse() {
      return new Promise((resolve, reject) => {
         this.session
            .request(`/Classes/${this.classe.id}/viedelaclasse.awp?verbe=get`)
            .then(data => resolve(data))
            .catch(err => reject(err));
      });
   }

   /**
    * @returns {Promise}
    */
   fetchNotes() {
      return new Promise((resolve, reject) => {
         this.session
            .request(`/eleves/${this.id}/notes.awp?verbe=get`)
            .then(data => resolve(data))
            .catch(err => reject(err));
      });
   }

   /**
    * @param {Object} [options]
    * @param {String} options.query
    * @param {String} options.folder
    * @param {String} options.orderBy
    * @param {String} options.order
    * @param {Number} options.page
    * @param {Number} options.perPage
    * @param {Object} options.options
    * @returns {Promise}
    */
   fetchMessages({ query, folder, orderBy, order, page, perPage, ...options } = {}) {
      const queryString = new URLSearchParams({
         query: query || '',
         typeRecuperation: folder || 'received',
         orderBy: orderBy || 'date',
         order: order || 'desc',
         page: page || 0,
         itemsPerPage: perPage || 20,
         force: true,
         idClasseur: 0,
         onlyRead: '',
         verbe: 'getall',
         ...options,
      }).toString();

      return new Promise((resolve, reject) => {
         this.session
            .request(`/eleves/${this.id}/messages.awp?${queryString}`)
            .then(data => resolve(data))
            .catch(err => reject(err));
      });
   }

   /**
    *
    * @param {Number} messageId
    * @param {String} [mode]
    * @returns {Promise}
    */
   fetchMessage(messageId, mode = 'destinataire') {
      if (!messageId) throw new Error('ID du message non renseigné.');

      return new Promise((resolve, reject) => {
         this.session
            .request(`/eleves/${this.id}/messages/${messageId}.awp?verbe=get&mode=${mode}`)
            .then(data => resolve(data))
            .catch(err => reject(err));
      });
   }

   /**
    *
    * @param {Date} start
    * @param {Date} end
    * @returns {Promise}
    */
   fetchEDT(start = new Date(), end = new Date(start.getTime() + 86400000)) {
      start = dateToString(start);
      end = dateToString(end);

      return new Promise((resolve, reject) => {
         this.session
            .request(`/E/${this.id}/emploidutemps.awp?verbe=get`, {
               dateDebut: start,
               dateFin: end,
               avecTrous: false,
            })
            .then(data => resolve(data))
            .catch(err => reject(err));
      });
   }

   /**
    * @param {Date} [jour]
    * @returns {Promise<Object>}
    */
   fetchAgenda(jour) {
      return new Promise((resolve, reject) => {
         this.session
            .request(
               `/Eleves/${this.id}/cahierdetexte${
                  jour ? '/' + dateToString(jour) : ''
               }.awp?verbe=get`
            )
            .then(data => resolve(data))
            .catch(err => reject(err));
      });
   }

   /**
    * @returns {Promise}
    */
   fetchDocuments() {
      return new Promise((resolve, reject) => {
         this.session
            .request(`/elevesDocuments.awp?archive=&verbe=get`)
            .then(data => resolve(data))
            .catch(err => reject(err));
      });
   }
};

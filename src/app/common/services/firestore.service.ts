import { Reviews } from '../models/reviews.model';
// import { Reviews } from 'src/app/common/models/reviews.model';
import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, getDoc, setDoc, DocumentData, WithFieldValue,
  collectionData, docData, getDocs, deleteDoc, DocumentReference, CollectionReference,
  DocumentSnapshot, QueryDocumentSnapshot, query, where, QuerySnapshot, getFirestore,
  updateDoc
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
const { v4: uuidv4 } = require('uuid');

import { User } from '../models/users.models';
import { Citas } from '../models/cita.model';
// import { Reviews } from '../models/reviews.model';
// import { Reviews } from './../models/reviews.model';
import { Service } from '../models/service.models';
import { CategoryI } from '../models/categoria.model';

// Convertidor genérico para Firestore
const converter = <T>() => ({
  toFirestore: (data: WithFieldValue<T>) => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData>) => snapshot.data() as T
});

const docWithConverter = <T>(firestore: Firestore, path: string) =>
  doc(firestore, path).withConverter(converter<T>());

const collectionWithConverter = <T>(firestore: Firestore, path: string) =>
  collection(firestore, path).withConverter(converter<T>());

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  private firestore: Firestore = inject(Firestore);

  constructor() { }

  getFirestoreInstance(): Firestore {
    return this.firestore;
  }

  getDocument<T>(enlace: string): Promise<DocumentSnapshot<T>> {
    const document = docWithConverter<T>(this.firestore, enlace);
    return getDoc(document);
  }

  getCollectionChanges<T extends { id?: string }>(path: string): Observable<T[]> {
    const itemCollection = collection(this.firestore, path) as CollectionReference<T>;
    return collectionData(itemCollection, { idField: 'id' }) as Observable<T[]>;
  }

  createDocument<T>(data: T, enlace: string): Promise<void> {
    const document = docWithConverter<T>(this.firestore, enlace);
    return setDoc(document, data);
  }

  async createDocumentWithAutoId<T>(data: T, enlace: string): Promise<void> {
    const itemCollection = collection(this.firestore, enlace) as CollectionReference<T>;
    const newDocRef = doc(itemCollection).withConverter(converter<T>());
    await setDoc(newDocRef, data);
  }

  deleteDocumentID(enlace: string, idDoc: string): Promise<void> {
    const document = doc(this.firestore, `${enlace}/${idDoc}`);
    return deleteDoc(document);
  }

  deleteDocFromRef(ref: DocumentReference): Promise<void> {
    return deleteDoc(ref);
  }

  createIdDoc(): string {
    return uuidv4();
  }

  async getAuthUser() {
    return { uid: '05OTLvPNICH5Gs9ZsW0k' };
  }

  getDocumentById<T>(collectionPath: string, id: string): Observable<T | undefined> {
    const docRef = doc(this.firestore, `${collectionPath}/${id}`).withConverter(converter<T>());
    return from(getDoc(docRef)).pipe(
      map(docSnapshot => docSnapshot.exists() ? docSnapshot.data() as T : undefined)
    );
  }

  async getUserData(userId: string): Promise<User | undefined> {
    try {
      const userDocRef = doc(this.firestore, `Usuarios/${userId}`).withConverter(converter<User>());
      const userDocSnap = await getDoc(userDocRef);
      return userDocSnap.exists() ? userDocSnap.data() : undefined;
    } catch (error) {
      console.error("Error al recuperar los datos del usuario:", error);
      throw error;
    }
  }

  async createCita(data: Citas): Promise<void> {
    const document = docWithConverter<Citas>(this.firestore, `Citas/${data.id}`);
    return setDoc(document, data);
  }

  async getAppointmentsByDate(date: string): Promise<Citas[]> {
    const appointmentsRef = collection(this.firestore, 'Citas') as CollectionReference<Citas>;
    const querySnapshot = await getDocs(appointmentsRef);
    const appointments: Citas[] = [];
    querySnapshot.forEach(doc => {
      const appointment = doc.data();
      if (appointment.fecha_cita.startsWith(date)) {
        appointments.push(appointment);
      }
    });
    return appointments;
  }

  async getAppointmentsByService(serviceId: string): Promise<Citas[]> {
    const appointmentsRef = collection(this.firestore, 'Citas') as CollectionReference<Citas>;
    const querySnapshot = await getDocs(query(appointmentsRef, where('servicio_id', '==', serviceId)));
    const appointments: Citas[] = [];
    querySnapshot.forEach(doc => {
      appointments.push(doc.data());
    });
    return appointments;
  }

  getHorariosByUserId(userId: string): Observable<QuerySnapshot<DocumentData>> {
    const horariosRef = collection(this.firestore, 'horarios');
    const horariosQuery = query(horariosRef, where('userId', '==', userId));
    return from(getDocs(horariosQuery));
  }

  async getReviewsByService(serviceId: string): Promise<Reviews[]> {
    try {
      const reviewsRef = collection(this.firestore, 'reviews') as CollectionReference<Reviews>;
      const reviewsQuery = query(reviewsRef, where('servicio_id', '==', serviceId));
      const querySnapshot = await getDocs(reviewsQuery);

      const reviews: Reviews[] = [];
      querySnapshot.forEach(doc => {
        const review = doc.data();
        reviews.push(review);
      });
      console.log('Reviews:', reviews);
      return reviews;
    } catch (error) {
      console.error('Error retrieving reviews for service ID:', serviceId, error);
      throw error;
    }
  }

  async getReviewsByProviderId(providerId: string): Promise<Reviews[]> {
    try {
      const servicesRef = collectionWithConverter<Service>(this.firestore, 'services');
      const servicesQuery = query(servicesRef, where('providerId', '==', providerId));
      const servicesSnapshot = await getDocs(servicesQuery);

      const reviews: Reviews[] = [];
      for (const serviceDoc of servicesSnapshot.docs) {
        const service = serviceDoc.data();
        const reviewsRef = collectionWithConverter<Reviews>(this.firestore, 'reviews');
        const reviewsQuery = query(reviewsRef, where('servicio_id', '==', service.id));
        const reviewsSnapshot = await getDocs(reviewsQuery);
        reviewsSnapshot.forEach(doc => {
          reviews.push(doc.data());
        });
      }
      console.log('All reviews for provider services:', reviews);
      return reviews;
    } catch (error) {
      console.error('Error retrieving reviews for provider ID:', providerId, error);
      throw error;
    }
  }

  async createService(service: Service): Promise<void> {
    const serviceId = this.createIdDoc();
    service.id = serviceId;
    // console.log('Creando servicio con ID:', serviceId);
    const serviceRef = doc(this.firestore, `services/${serviceId}`).withConverter(converter<Service>());
    await setDoc(serviceRef, service);
    // console.log('Servicio creado en Firestore:', service);
  }

  async getServices(): Promise<Service[]> {
    const servicesRef = collection(this.firestore, 'services') as CollectionReference<Service>;
    const querySnapshot = await getDocs(servicesRef);
    const services: Service[] = [];
    querySnapshot.forEach((doc) => {
      services.push(doc.data());
    });
    return services;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const usersRef = collection(this.firestore, 'usuarios') as CollectionReference<User>;
      const userQuery = query(usersRef, where('correo', '==', email));
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
      }
      return undefined;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  getServiceByProviderId(providerId: string): Observable<Service> {
    const servicesRef = collection(this.firestore, 'services') as CollectionReference<Service>;
    const serviceQuery = query(servicesRef, where('providerId', '==', providerId));
    return collectionData(serviceQuery, { idField: 'id' }).pipe(
      map((services: Service[]) => services[0]) // assuming one service per provider
    );
  }

  async createAppointment(appointment: Citas): Promise<void> {
    const appointmentRef = docWithConverter<Citas>(this.firestore, `Citas/${appointment.id}`);
    return setDoc(appointmentRef, appointment);
  }

  // Método para obtener citas por usuario_id
  async getAppointmentsByUserId(userId: string): Promise<Citas[]> {
    const appointmentsRef = collection(this.firestore, 'Citas') as CollectionReference<Citas>;
    const querySnapshot = await getDocs(query(appointmentsRef, where('usuario_id', '==', userId)));
    const appointments: Citas[] = [];
    querySnapshot.forEach(doc => {
      appointments.push(doc.data());
    });
    return appointments;
  }

  // Método para obtener reseñas por cliente_id
  async getReviewsByClientId(clientId: string): Promise<Reviews[]> {
    const reviewsRef = collection(this.firestore, 'reviews') as CollectionReference<Reviews>;
    const querySnapshot = await getDocs(query(reviewsRef, where('cliente_id', '==', clientId)));
    const reviews: Reviews[] = [];
    querySnapshot.forEach(doc => {
      reviews.push(doc.data());
    });
    return reviews;
  }

  async getServiceById(serviceId: string): Promise<Service | undefined> {
    try {
      const serviceRef = doc(this.firestore, `services/${serviceId}`).withConverter(converter<Service>());
      const serviceSnapshot = await getDoc(serviceRef);
      if (serviceSnapshot.exists()) {
        const data = serviceSnapshot.data();
        // console.log('Service data:', data);
        return data;
      } else {
        console.error('No such document with ID:', serviceId);
        return undefined;
      }
    } catch (error) {
      console.error('Error retrieving document with ID:', serviceId, error);
      throw error;
    }
  }

   // Método para actualizar la URL de la imagen de perfil del usuario
   async updateUserProfileImage(userId: string, imageUrl: string): Promise<void> {
    try {
      const userDocRef = doc(this.firestore, `usuarios/${userId}`);
      await updateDoc(userDocRef, { imagen: imageUrl });
      // console.log('Imagen de perfil actualizada en Firestore');
    } catch (error) {
      console.error('Error actualizando la imagen de perfil:', error);
    }
  }

  async updateServiceProfileImage(serviceId: string, imageUrl: string): Promise<void> {
    const serviceRef = doc(this.firestore, `services/${serviceId}`);
    try {
      await updateDoc(serviceRef, { imageUrl });
      // console.log('Service profile image updated successfully in Firestore');
    } catch (error) {
      console.error('Error updating service profile image:', error);
      throw error;
    }
  }

  async updateService(serviceId: string, serviceData: Partial<Service>): Promise<void> {
    const serviceRef = doc(this.firestore, `services/${serviceId}`);
    try {
      await updateDoc(serviceRef, serviceData);
      // console.log('Service updated successfully in Firestore');
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }
  async deleteReview(reviewId: string): Promise<void> {
    try {
      const reviewRef = doc(this.firestore, `reviews/${reviewId}`);
      // Check if the document exists before attempting to delete
      const reviewSnapshot = await getDoc(reviewRef);
      if (!reviewSnapshot.exists()) {
        console.error('Review does not exist:', reviewId);
        return;
      }
      await deleteDoc(reviewRef);
      // console.log('Review deleted successfully in Firestore');
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }

  async createReview(review: Reviews): Promise<void> {
    const reviewId = this.createIdDoc();
    review.id = reviewId;
    // console.log('Creando reseña con ID:', reviewId);
    const reviewRef = doc(this.firestore, `reviews/${reviewId}`).withConverter(converter<Reviews>());
    await setDoc(reviewRef, review);
    // console.log('Reseña creada en Firestore:', review);
  }


  async updateDocument(collection: string, docId: string, data: any): Promise<void> {
    const docRef = doc(this.firestore, `${collection}/${docId}`);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      throw new Error('No document to update');
    }
    await updateDoc(docRef, data);
  }
  async deleteDocument(collection: string, docId: string): Promise<void> {
    const docRef = doc(this.firestore, `${collection}/${docId}`);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.error('Document does not exist:', docId);
      return;
    }
    await deleteDoc(docRef);
  }


 // Método para obtener el resumen de actividad del día
  async getResumenActividad(): Promise<{ nuevasCitas: number, calificacionPromedio: number }> {
    const hoy = new Date().toISOString().split('T')[0]; // Obtener la fecha actual en formato YYYY-MM-DD
    const citasRef = collection(this.firestore, 'Citas') as CollectionReference<Citas>;
    const querySnapshotCitas = await getDocs(query(citasRef, where('fecha_cita', '==', hoy)));

    let nuevasCitas = 0;
    querySnapshotCitas.forEach(() => {
      nuevasCitas++;
    });

    const reviewsRef = collection(this.firestore, 'reviews') as CollectionReference<Reviews>;
    const querySnapshotReviews = await getDocs(query(reviewsRef, where('fecha', '==', hoy)));

    let calificacionTotal = 0;
    let cantidadResenas = 0;

    querySnapshotReviews.forEach(doc => {
      const review = doc.data();
      calificacionTotal += review.calificacion;
      cantidadResenas++;
    });

    const calificacionPromedio = cantidadResenas > 0 ? calificacionTotal / cantidadResenas : 0;

    return { nuevasCitas, calificacionPromedio };
  }

  // Método para obtener las próximas citas
  async getProximasCitas(): Promise<Citas[]> {
    const hoy = new Date().toISOString().split('T')[0]; // Obtener la fecha actual en formato YYYY-MM-DD
    const citasRef = collection(this.firestore, 'Citas') as CollectionReference<Citas>;
    const querySnapshot = await getDocs(query(citasRef, where('fecha_cita', '>', hoy)));

    const citas: Citas[] = [];
    querySnapshot.forEach(doc => {
      citas.push(doc.data());
    });

    return citas;
  }


  // Método para obtener las reseñas del día
  async getResenasDelDia(): Promise<Reviews[]> {
    const hoy = new Date().toISOString().split('T')[0]; // Obtener la fecha actual en formato YYYY-MM-DD
    const reviewsRef = collection(this.firestore, 'reviews') as CollectionReference<Reviews>;
    const querySnapshot = await getDocs(query(reviewsRef, where('fecha', '==', hoy)));

    const reviews: Reviews[] = [];
    querySnapshot.forEach(doc => {
      reviews.push(doc.data());
    });

    return reviews;
  }
  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    const userDocRef = doc(this.firestore, `usuarios/${userId}`);
    await updateDoc(userDocRef, data);
  }

// Método para obtener todos los servicios
  async getAllServices(): Promise<Service[]> {
    const servicesRef = collection(this.firestore, 'services') as CollectionReference<Service>;
    const querySnapshot = await getDocs(servicesRef);
    const services: Service[] = [];
    querySnapshot.forEach((doc) => {
      services.push(doc.data());
    });
    return services;
  }
}





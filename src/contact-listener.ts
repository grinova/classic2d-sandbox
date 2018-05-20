import { Contact, ContactListener as BaseContactListener } from 'classic2d';

export class ContactListener<T = any> implements BaseContactListener<T> {
  on: boolean = false;

  beginContact(_contact: Contact): void {
    if (this.on) {
      console.log('Begin contact');
    }
  }

  endContact(_contact: Contact): void {
    if (this.on) {
      console.log('End contact');
    }
  }

  preSolve(_contact: Contact): void {
    if (this.on) {
      console.log('Pre solve');
    }
  }
}

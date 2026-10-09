export const INCOMING_OFFERS_CHANGED = 'candidate-offers:changed';

export const notifyIncomingOffersChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(INCOMING_OFFERS_CHANGED));
  }
};

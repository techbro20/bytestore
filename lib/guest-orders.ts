'use client';

const EMAIL_KEY = 'bytestore-guest-email';

export function getGuestEmail() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(EMAIL_KEY) || '';
}

export function setGuestEmail(email: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
}

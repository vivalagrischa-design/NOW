export const iso = (d = 0) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
// Ende < Start => über Mitternacht
const win = (date, s, e) => { const a = mins(s), b = mins(e) <= a ? mins(e) + 1440 : mins(e); return [a, b]; };
export const overlap = (A, B) => {
  if (A.city.toLowerCase() !== B.city.toLowerCase() || A.date !== B.date) return 0;
  const [a1, a2] = win(A.date, A.start, A.end), [b1, b2] = win(B.date, B.start, B.end);
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
};
export const expired = (s) => {
  const [, e] = win(s.date, s.start, s.end);
  const d = new Date(s.date + 'T00:00:00'); d.setMinutes(e);
  return d.getTime() < Date.now();
};
export const PEOPLE = [
  { id: 'p1', img: require('../assets/lena.jpg'), name: 'Lena', age: 27, city: 'Zürich', dist: 3, date: iso(0), start: '20:00', end: '24:00', vibes: ['Casual', 'Open-minded'], single: true, verified: true, bio: 'Gute Stimmung, gute Gesellschaft. Suche etwas Unkompliziertes.', likesYou: true },
  { id: 'p2', img: require('../assets/sophie.jpg'), name: 'Sophie', age: 29, city: 'Zürich', dist: 5, date: iso(0), start: '19:00', end: '23:00', vibes: ['Fun'], single: true, verified: true, bio: 'Drink first, dann sehen wir weiter.', likesYou: true },
  { id: 'p3', img: require('../assets/lena.jpg'), name: 'Tom & Leila', age: 31, city: 'Zürich', dist: 8, date: iso(1), start: '20:00', end: '02:00', vibes: ['Couples', 'Discrete'], single: false, verified: true, bio: 'Paar, offen und respektvoll.', likesYou: true },
  { id: 'p4', img: require('../assets/nina.jpg'), name: 'Nina', age: 26, city: 'Zürich', dist: 2, date: iso(0), start: '18:00', end: '21:00', vibes: ['Casual'], single: true, verified: false, bio: 'Heute spontan frei.', likesYou: false },
  { id: 'p5', img: require('../assets/laura.jpg'), name: 'Anna', age: 31, city: 'Basel', dist: 12, date: iso(2), start: '14:00', end: '20:00', vibes: ['Fun', 'Kinky'], single: true, verified: true, bio: 'Sonntag in Basel.', likesYou: true },
  { id: 'p6', img: require('../assets/mia.jpg'), name: 'Marta', age: 28, city: 'Barcelona', dist: 4, date: iso(7), start: '20:00', end: '24:00', vibes: ['Open-minded'], single: true, verified: true, bio: 'Nächste Woche in Barcelona.', likesYou: true },
];

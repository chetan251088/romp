export const winterWords = ['en vante', 'en halsduk', 'en hatt', 'en nyckel', 'en ficklampa', 'en bjällra'];
export const winterPlaces = ['vid granen', 'vid stugan', 'vid bron'];
export const winterRescues = [
  { animal: 'Räven', item: 0, place: 0 }, { animal: 'Haren', item: 3, place: 2 },
  { animal: 'Ugglan', item: 2, place: 1 }, { animal: 'Musen', item: 1, place: 0 },
  { animal: 'Björnen', item: 4, place: 1 }, { animal: 'Ekorren', item: 5, place: 2 },
];

export function winterClues(quest: number, long: boolean) {
  const { animal, item, place: index } = winterRescues[quest], word = winterWords[item], place = winterPlaces[index];
  return {
    item: long ? 'Kan du hjälpa ' + animal.toLowerCase() + ' att hitta ' + word + '?' : 'Hitta ' + word + '!',
    trail: long ? animal + ' väntar ' + place + '.' : place[0].toUpperCase() + place.slice(1) + '.',
  };
}

export const classroomClues = ['Välj en katt.', 'Välj en hund.', 'Var är den blå stjärnan?', 'Välj två hjärtan.', 'Vilket djur kan flyga?', 'Välj en röd blomma.'];
export const familyClues = ['Välj solen!', 'Välj månen!', 'Välj en kanin!', 'Vilken kan smälta i solen?', 'Vad kan vi ha på huvudet?'];
export const spokenClues = [...new Set([
  ...winterRescues.flatMap((_, index) => [false, true].flatMap((long) => Object.values(winterClues(index, long)))),
  ...classroomClues, ...familyClues,
])];

export function clipName(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '') + '.wav';
}

export function suggestAbbreviation(name) {
    const clean = (name || '').replace(/[^A-Za-z0-9\s]/g, '').trim().toUpperCase();
    if (!clean) return '';
    if (clean.length <= 3) return clean;
    const words = clean.split(/\s+/);
    let letters = words.map(w => w[0]).join('');
    if (letters.length >= 3) return letters.slice(0,3);
    letters += clean.replace(/\s+/g, '').slice(letters.length);
    return letters.slice(0,3);
}

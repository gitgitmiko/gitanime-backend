const scraper = require('./scraper');

async function testImageMapping() {
  console.log('Testing image mapping...\n');
  
  const testTitles = [
    'Dandadan Season 2',
    'Dr. Stone Season 4 Part 2',
    'Tsuyokute New Saga',
    'Jidou Hanbaiki ni Umarekawatta Season 2',
    'Uchuujin MuuMuu',
    'Onmyou Kaiten ReBirth',
    'Jigoku Sensei Nube (2025)',
    'Tensei shitara Dainana Ouji Season 2',
    'Tate no Yuusha no Nariagari Season 4',
    'Clevatess',
    'Kanojo, Okarishimasu'
  ];
  
  for (const title of testTitles) {
    console.log(`\n--- Testing: "${title}" ---`);
    const image = scraper.getAnimeImageSync(title);
    console.log(`Result: ${image}`);
  }
}

testImageMapping().catch(console.error);

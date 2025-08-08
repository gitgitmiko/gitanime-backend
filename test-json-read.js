const fs = require('fs');

async function testJsonRead() {
  try {
    // Read file as string first
    const fileContent = fs.readFileSync('./data/anime-data.json', 'utf8');
    console.log('File size:', fileContent.length, 'characters');
    
    // Parse JSON
    const data = JSON.parse(fileContent);
    console.log('Total items in data.anime:', data.anime.length);
    console.log('Total anime:', data.totalAnime);
    console.log('Total episodes:', data.totalEpisodes);
    
    // Check episodes
    const episodes = data.anime.filter(item => item.episodeNumber);
    console.log('Items with episodeNumber:', episodes.length);
    
    if (episodes.length > 0) {
      console.log('First episode:', episodes[0].title, episodes[0].episodeNumber);
      console.log('Last episode:', episodes[episodes.length - 1].title, episodes[episodes.length - 1].episodeNumber);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testJsonRead();

const fs = require('fs-extra');

async function debugAnimeAPI() {
  try {
    const data = await fs.readJson('./data/anime-data.json');
    console.log('Total items in data.anime:', data.anime.length);
    
    // Check items with episodeNumber
    const episodes = data.anime.filter(item => item.episodeNumber);
    console.log('Items with episodeNumber:', episodes.length);
    
    if (episodes.length > 0) {
      console.log('Sample episode:', episodes[0]);
      console.log('Sample episode has postedBy:', episodes[0].postedBy);
      console.log('Sample episode has releasedOn:', episodes[0].releasedOn);
    }
    
    // Check episodes with postedBy
    const episodesWithPostedBy = episodes.filter(item => item.postedBy);
    console.log('Episodes with postedBy:', episodesWithPostedBy.length);
    
    if (episodesWithPostedBy.length > 0) {
      console.log('Sample episode with postedBy:', episodesWithPostedBy[0]);
    }
    
    // Check items without episodeNumber (anime titles)
    const animeTitles = data.anime.filter(item => !item.episodeNumber);
    console.log('Items without episodeNumber (anime titles):', animeTitles.length);
    
    if (animeTitles.length > 0) {
      console.log('Sample anime title:', animeTitles[0]);
    }
    
    // Test the filtering logic
    const allEpisodes = data.anime.filter(item => item.episodeNumber) || [];
    console.log('Filtered episodes:', allEpisodes.length);
    
    // Test sorting
    const sortedEpisodes = allEpisodes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log('Sorted episodes:', sortedEpisodes.length);
    
    if (sortedEpisodes.length > 0) {
      console.log('First episode after sorting:', sortedEpisodes[0].title, sortedEpisodes[0].episodeNumber);
      console.log('Last episode after sorting:', sortedEpisodes[sortedEpisodes.length - 1].title, sortedEpisodes[sortedEpisodes.length - 1].episodeNumber);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugAnimeAPI();

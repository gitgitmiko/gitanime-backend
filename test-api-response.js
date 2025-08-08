const axios = require('axios');

async function testAPIResponse() {
  console.log('🔍 Testing API Response...\n');
  
  try {
    // Test API endpoint
    const response = await axios.get('http://localhost:5000/api/anime');
    
    if (response.status === 200) {
      console.log('✅ API Response Status: 200 OK');
      console.log(`📊 Total anime: ${response.data.anime.length}\n`);
      
      // Check first 5 anime for image mapping
      console.log('🎯 Image Mapping Verification:');
      response.data.anime.slice(0, 5).forEach((anime, index) => {
        console.log(`\n${index + 1}. ${anime.title}`);
        console.log(`   Episode: ${anime.episodeNumber}`);
        console.log(`   Image: ${anime.image}`);
        console.log(`   Screenshot: ${anime.episodeScreenshot}`);
        console.log(`   Image matches Screenshot: ${anime.image === anime.episodeScreenshot ? '✅' : '❌'}`);
      });
      
      // Check for any missing images
      const missingImages = response.data.anime.filter(anime => !anime.image);
      if (missingImages.length > 0) {
        console.log(`\n❌ Found ${missingImages.length} anime with missing images:`);
        missingImages.forEach(anime => {
          console.log(`   - ${anime.title}`);
        });
      } else {
        console.log('\n✅ All anime have images!');
      }
      
    } else {
      console.log(`❌ API Error: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testAPIResponse();

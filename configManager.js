const fs = require('fs-extra');
const path = require('path');

// Production environment check
const isProduction = process.env.NODE_ENV === 'production';
const CONFIG_FILE = isProduction ? '/tmp/config.json' : './data/config.json';

class ConfigManager {
  constructor() {
    this.configFile = CONFIG_FILE;
    this.ensureConfigFile();
  }

  async ensureConfigFile() {
    try {
      if (!isProduction) {
        await fs.ensureDir('./data');
      }
      
      const configExists = await fs.pathExists(this.configFile);
      if (!configExists) {
        const defaultConfig = {
          sourceUrl: 'https://v1.samehadaku.how/',
          scrapingInterval: '0 0 * * *',
          autoScraping: true
        };
        await fs.writeJson(this.configFile, defaultConfig, { spaces: 2 });
      }
    } catch (error) {
      console.error('Error ensuring config file:', error);
    }
  }

  async getConfig() {
    try {
      await this.ensureConfigFile();
      return await fs.readJson(this.configFile);
    } catch (error) {
      console.error('Error reading config:', error);
      return {
        sourceUrl: 'https://v1.samehadaku.how/',
        scrapingInterval: '0 0 * * *',
        autoScraping: true
      };
    }
  }

  async updateConfig(newConfig) {
    try {
      await this.ensureConfigFile();
      const currentConfig = await this.getConfig();
      const updatedConfig = { ...currentConfig, ...newConfig };
      await fs.writeJson(this.configFile, updatedConfig, { spaces: 2 });
      return updatedConfig;
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }
}

module.exports = new ConfigManager();

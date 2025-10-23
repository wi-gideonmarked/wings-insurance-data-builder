// Data service that abstracts between local JSON files and RDS API

export type StructureItem = {
  hash: string;
  labelMake: string;
  labelModel: string;
  oraeroModel: string;
  oraeroMake: string;
  iatMake: string;
  iatModel: string;
  rokstoneMake: string;
  rokstoneModel: string;
  sfMake: string;
  sfModel: string;
  year: number;
};

export type DataSource = 'local' | 'rds';

export interface DataServiceConfig {
  source: DataSource;
  rdsApiUrl?: string;
  rdsAuthToken?: string;
}

class DataService {
  private config: DataServiceConfig;

  constructor(config: DataServiceConfig) {
    this.config = config;
  }

  // Update configuration
  updateConfig(config: Partial<DataServiceConfig>) {
    this.config = { ...this.config, ...config };
  }

  // Get list of available files/makes
  async getAvailableFiles(): Promise<string[]> {
    if (this.config.source === 'rds') {
      return this.getAvailableFilesFromRDS();
    } else {
      return this.getAvailableFilesFromLocal();
    }
  }

  private async getAvailableFilesFromLocal(): Promise<string[]> {
    // Hardcoded list of local files
    return [
      'aeronca.json', 'aero-commander.json', 'aeropro-cz.json', 'aerotek.json', 
      'aerotrek.json', 'amd.json', 'american-champion.json', 'american-general.json', 
      'american-legend.json', 'arion.json', 'aviat.json', 'backcountry-super-cubs.json', 
      'beech.json', 'bellanca.json', 'boeing.json', 'breezer-aircraft.json', 'cessna.json', 
      'champion.json', 'christen-industries.json', 'cirrus.json', 'classic-aircraft-corp.json', 
      'columbia.json', 'commonwealth.json', 'consolidated-aircraft-corp-stinson.json', 
      'cubcrafters.json', 'czech-aircraft.json', 'dakota-cub-aircraft.json', 'davis.json', 
      'dehavilland.json', 'diamond.json', 'dova-aircraft.json', 'eagle-aircraft.json', 
      'evektor-aerotechnik.json', 'extra.json', 'falcon-aircraft-corp.json', 'fantasy-air.json', 
      'flight-design.json', 'fpna.json', 'glasair.json', 'grumman.json', 'grumman-american.json', 
      'gulfstream.json', 'hatz.json', 'howard.json', 'icon.json', 'indus.json', 
      'iniziative-industriali-italian.json', 'jabiru.json', 'jihlavan-airplanes-sro.json', 
      'just-aircraft.json', 'kitfox.json', 'lake.json', 'luscombe.json', 'maule.json', 
      'meyers.json', 'mooney.json', 'murphy.json', 'navion.json', 'north-american.json', 
      'paradise.json', 'parkinson.json', 'piper.json', 'pipistrel.json', 'pitts.json', 
      'rans.json', 'reims.json', 'remos-aircraft.json', 'rockwell-commander.json', 'ryan.json', 
      'sky-arrow.json', 'smith-super-cub.json', 'socata.json', 'stearman-aircraft.json', 
      'stinson.json', 'super-18.json', 'taylorcraft.json', 'tecnam.json', 'thorp.json', 
      'tiger-aircraft.json', 'tl-ultralight-sro.json', 'unknown.json', 'vans.json', 
      'waco.json', 'zlin.json'
    ];
  }

  private async getAvailableFilesFromRDS(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.rdsApiUrl}/api/makes`, {
        headers: {
          'Authorization': `Bearer ${this.config.rdsAuthToken || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const makes = await response.json();
      return makes.map((make: { slug: string }) => `${make.slug}.json`);
    } catch (error) {
      console.error('[DataService] Failed to fetch makes from RDS:', error);
      throw error;
    }
  }

  // Load models for a specific file/make
  async loadModels(filename: string): Promise<StructureItem[]> {
    if (this.config.source === 'rds') {
      return this.loadModelsFromRDS(filename);
    } else {
      return this.loadModelsFromLocal(filename);
    }
  }

  private async loadModelsFromLocal(filename: string): Promise<StructureItem[]> {
    const url = `/separated/${filename}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }

    return await response.json();
  }

  private async loadModelsFromRDS(filename: string): Promise<StructureItem[]> {
    const slug = filename.replace('.json', '');

    try {
      const response = await fetch(`${this.config.rdsApiUrl}/api/makes/${slug}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.rdsAuthToken || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[DataService] Failed to load models for ${slug} from RDS:`, error);
      throw error;
    }
  }

  // Create a new model
  async createModel(model: StructureItem): Promise<void> {
    if (this.config.source === 'rds') {
      return this.createModelInRDS(model);
    } else {
      throw new Error('Create operation not supported for local JSON files');
    }
  }

  private async createModelInRDS(model: StructureItem): Promise<void> {
    try {
      const response = await fetch(`${this.config.rdsApiUrl}/api/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.rdsAuthToken || ''}`
        },
        body: JSON.stringify(model)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Failed to create model');
      }
    } catch (error) {
      console.error('[DataService] Failed to create model in RDS:', error);
      throw error;
    }
  }

  // Update an existing model
  async updateModel(hash: string, model: StructureItem): Promise<void> {
    if (this.config.source === 'rds') {
      return this.updateModelInRDS(hash, model);
    } else {
      throw new Error('Update operation not supported for local JSON files');
    }
  }

  private async updateModelInRDS(hash: string, model: StructureItem): Promise<void> {
    try {
      const response = await fetch(`${this.config.rdsApiUrl}/api/models/${hash}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.rdsAuthToken || ''}`
        },
        body: JSON.stringify(model)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Failed to update model');
      }
    } catch (error) {
      console.error('[DataService] Failed to update model in RDS:', error);
      throw error;
    }
  }

  // Delete a model
  async deleteModel(hash: string): Promise<void> {
    if (this.config.source === 'rds') {
      return this.deleteModelFromRDS(hash);
    } else {
      throw new Error('Delete operation not supported for local JSON files');
    }
  }

  private async deleteModelFromRDS(hash: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.rdsApiUrl}/api/models/${hash}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.rdsAuthToken || ''}`
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Failed to delete model');
      }
    } catch (error) {
      console.error('[DataService] Failed to delete model from RDS:', error);
      throw error;
    }
  }

  // Check if write operations are supported
  supportsWrite(): boolean {
    return this.config.source === 'rds';
  }

  // Get current data source
  getDataSource(): DataSource {
    return this.config.source;
  }
}

// Singleton instance
let dataServiceInstance: DataService | null = null;

export function initDataService(config: DataServiceConfig): DataService {
  dataServiceInstance = new DataService(config);
  return dataServiceInstance;
}

export function getDataService(): DataService {
  if (!dataServiceInstance) {
    throw new Error('DataService not initialized. Call initDataService first.');
  }
  return dataServiceInstance;
}

export default DataService;


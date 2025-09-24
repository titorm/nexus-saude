// Minimal in-src dev DB for FHIR service
export class DevDatabaseService {
  public isConnected = true;

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  // simple in-memory storage for FHIR resources
  private resources: Record<string, any[]> = {};

  async saveResource(type: string, resource: any): Promise<void> {
    if (!this.resources[type]) this.resources[type] = [];
    this.resources[type].push({ ...resource, _ts: new Date().toISOString() });
  }

  async getResources(type: string): Promise<any[]> {
    return this.resources[type] || [];
  }
}

export function createDevDatabaseService() {
  return new DevDatabaseService();
}

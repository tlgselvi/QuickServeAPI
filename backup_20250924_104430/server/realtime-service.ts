import { Response } from 'express';
import { storage } from './storage';

interface ClientConnection {
  userId: string;
  response: Response;
  lastData?: string;
}

class RealtimeService {
  private clients: Map<string, ClientConnection[]> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicUpdates();
  }

  // Add client connection for real-time updates
  addClient(userId: string, response: Response): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }

    const clientConnection: ClientConnection = {
      userId,
      response
    };

    this.clients.get(userId)!.push(clientConnection);

    // Send initial data immediately
    this.sendDashboardUpdate(userId);

    // Handle client disconnect
    response.on('close', () => {
      this.removeClient(userId, response);
    });

    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    response.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
  }

  // Remove client connection
  private removeClient(userId: string, response: Response): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const index = userClients.findIndex(client => client.response === response);
      if (index !== -1) {
        userClients.splice(index, 1);
        
        // Clean up empty user entries
        if (userClients.length === 0) {
          this.clients.delete(userId);
        }
      }
    }
  }

  // Send dashboard update to specific user
  private async sendDashboardUpdate(userId: string): Promise<void> {
    try {
      const dashboardData = await storage.getDashboardStats();
      const data = {
        type: 'dashboard_update',
        data: dashboardData,
        timestamp: Date.now()
      };

      const dataString = JSON.stringify(data);
      const userClients = this.clients.get(userId);
      
      if (userClients) {
        userClients.forEach(client => {
          // Only send if data has changed (prevent unnecessary updates)
          if (client.lastData !== dataString) {
            try {
              client.response.write(`data: ${dataString}\n\n`);
              client.lastData = dataString;
            } catch (error) {
              // Remove dead connections
              this.removeClient(userId, client.response);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error sending dashboard update:', error);
    }
  }

  // Broadcast update to all connected clients
  async broadcastUpdate(): Promise<void> {
    const userIds = Array.from(this.clients.keys());
    await Promise.all(userIds.map(userId => this.sendDashboardUpdate(userId)));
  }

  // Start periodic updates (every 30 seconds)
  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.broadcastUpdate();
    }, 30000);
  }

  // Stop periodic updates
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    let count = 0;
    for (const clients of this.clients.values()) {
      count += clients.length;
    }
    return count;
  }
}

export const realtimeService = new RealtimeService();


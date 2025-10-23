import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Client } from 'pg';

const app = express();
const PORT = process.env.API_PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

function getPgClient() {
  return new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || '5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
}

// Authentication middleware (simple token-based)
const authenticate = (req, res, next) => {
  const authToken = req.headers.authorization;
  const expectedToken = process.env.API_AUTH_TOKEN || 'your-secret-token';
  
  if (authToken === `Bearer ${expectedToken}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Health check
app.get('/health', async (req, res) => {
  const client = getPgClient();
  try {
    await client.connect();
    const result = await client.query('SELECT NOW()');
    res.json({ status: 'healthy', database: 'connected', timestamp: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  } finally {
    await client.end().catch(() => {});
  }
});

// Get all makes (manufacturers)
app.get('/api/makes', authenticate, async (req, res) => {
  const client = getPgClient();
  try {
    await client.connect();
    const result = await client.query(`
      SELECT id, slug, name, label
      FROM makes
      ORDER BY LOWER(name)
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await client.end().catch(() => {});
  }
});

// Get models for a specific make (by slug)
app.get('/api/makes/:slug/models', authenticate, async (req, res) => {
  const { slug } = req.params;
  const client = getPgClient();
  
  try {
    await client.connect();
    
    // Get models with provider mappings
    const result = await client.query(`
      SELECT 
        m.id,
        m.hash,
        m.label_make as "labelMake",
        m.label_model as "labelModel",
        m.year,
        m.sf_make as "sfMake",
        m.sf_model as "sfModel",
        json_agg(
          json_build_object(
            'providerId', p.id,
            'providerCode', p.code,
            'providerName', p.name,
            'providerMake', mpm.provider_make,
            'providerModel', mpm.provider_model,
            'isActive', mpm.is_active
          ) ORDER BY p.code
        ) FILTER (WHERE p.id IS NOT NULL) as providers
      FROM models m
      JOIN makes mk ON m.make_id = mk.id
      LEFT JOIN model_provider_mappings mpm ON m.id = mpm.model_id
      LEFT JOIN providers p ON mpm.provider_id = p.id
      WHERE mk.slug = $1
      GROUP BY m.id, m.hash, m.label_make, m.label_model, m.year, m.sf_make, m.sf_model
      ORDER BY m.year ASC NULLS LAST, m.label_model ASC
    `, [slug]);
    
    // Transform to match expected format
    const models = result.rows.map(row => {
      const model = {
        hash: row.hash,
        labelMake: row.labelMake,
        labelModel: row.labelModel,
        year: row.year,
        sfMake: row.sfMake || '',
        sfModel: row.sfModel || '',
        iatMake: '',
        iatModel: '',
        rokstoneMake: '',
        rokstoneModel: '',
        oraeroMake: '',
        oraeroModel: ''
      };
      
      // Add provider-specific fields
      if (row.providers) {
        for (const provider of row.providers) {
          const code = provider.providerCode;
          model[`${code}Make`] = provider.providerMake || '';
          model[`${code}Model`] = provider.providerModel || '';
        }
      }
      
      return model;
    });
    
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await client.end().catch(() => {});
  }
});

// Get a single model by hash
app.get('/api/models/:hash', authenticate, async (req, res) => {
  const { hash } = req.params;
  const client = getPgClient();
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT 
        m.id,
        m.hash,
        m.label_make as "labelMake",
        m.label_model as "labelModel",
        m.year,
        m.sf_make as "sfMake",
        m.sf_model as "sfModel",
        mk.slug as make_slug,
        json_agg(
          json_build_object(
            'providerId', p.id,
            'providerCode', p.code,
            'providerName', p.name,
            'providerMake', mpm.provider_make,
            'providerModel', mpm.provider_model,
            'isActive', mpm.is_active
          ) ORDER BY p.code
        ) FILTER (WHERE p.id IS NOT NULL) as providers
      FROM models m
      JOIN makes mk ON m.make_id = mk.id
      LEFT JOIN model_provider_mappings mpm ON m.id = mpm.model_id
      LEFT JOIN providers p ON mpm.provider_id = p.id
      WHERE m.hash = $1
      GROUP BY m.id, m.hash, m.label_make, m.label_model, m.year, m.sf_make, m.sf_model, mk.slug
    `, [hash]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    const row = result.rows[0];
    const model = {
      hash: row.hash,
      labelMake: row.labelMake,
      labelModel: row.labelModel,
      year: row.year,
      sfMake: row.sfMake || '',
      sfModel: row.sfModel || '',
      iatMake: '',
      iatModel: '',
      rokstoneMake: '',
      rokstoneModel: '',
      oraeroMake: '',
      oraeroModel: ''
    };
    
    if (row.providers) {
      for (const provider of row.providers) {
        const code = provider.providerCode;
        model[`${code}Make`] = provider.providerMake || '';
        model[`${code}Model`] = provider.providerModel || '';
      }
    }
    
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await client.end().catch(() => {});
  }
});

// Create a new model
app.post('/api/models', authenticate, async (req, res) => {
  const { hash, labelMake, labelModel, year, sfMake, sfModel, iatMake, iatModel, rokstoneMake, rokstoneModel, oraeroMake, oraeroModel } = req.body;
  
  if (!hash || !labelMake || !labelModel) {
    return res.status(400).json({ error: 'hash, labelMake, and labelModel are required' });
  }
  
  const client = getPgClient();
  
  try {
    await client.connect();
    await client.query('BEGIN');
    
    // Get or create make
    const makeSlug = labelMake.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let makeResult = await client.query('SELECT id FROM makes WHERE slug = $1', [makeSlug]);
    
    let makeId;
    if (makeResult.rows.length === 0) {
      const insertMakeResult = await client.query(
        'INSERT INTO makes (slug, name, label) VALUES ($1, $2, $2) RETURNING id',
        [makeSlug, labelMake]
      );
      makeId = insertMakeResult.rows[0].id;
    } else {
      makeId = makeResult.rows[0].id;
    }
    
    // Create model
    const modelResult = await client.query(`
      INSERT INTO models (make_id, hash, label_make, label_model, year, sf_make, sf_model)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [makeId, hash, labelMake, labelModel, year || null, sfMake || null, sfModel || null]);
    
    const modelId = modelResult.rows[0].id;
    
    // Create provider mappings
    const providers = [
      { code: 'iat', make: iatMake, model: iatModel },
      { code: 'rokstone', make: rokstoneMake, model: rokstoneModel },
      { code: 'oraero', make: oraeroMake, model: oraeroModel }
    ];
    
    for (const provider of providers) {
      if (provider.make && provider.model) {
        const providerResult = await client.query('SELECT id FROM providers WHERE code = $1', [provider.code]);
        if (providerResult.rows.length > 0) {
          await client.query(`
            INSERT INTO model_provider_mappings (model_id, provider_id, provider_make, provider_model)
            VALUES ($1, $2, $3, $4)
          `, [modelId, providerResult.rows[0].id, provider.make, provider.model]);
        }
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json({ message: 'Model created', hash });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: error.message });
  } finally {
    await client.end().catch(() => {});
  }
});

// Update a model
app.put('/api/models/:hash', authenticate, async (req, res) => {
  const { hash } = req.params;
  const { labelMake, labelModel, year, sfMake, sfModel, iatMake, iatModel, rokstoneMake, rokstoneModel, oraeroMake, oraeroModel } = req.body;
  
  const client = getPgClient();
  
  try {
    await client.connect();
    await client.query('BEGIN');
    
    // Check if model exists
    const existingModel = await client.query('SELECT id, make_id FROM models WHERE hash = $1', [hash]);
    if (existingModel.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    const modelId = existingModel.rows[0].id;
    
    // Update model
    await client.query(`
      UPDATE models
      SET label_make = $1,
          label_model = $2,
          year = $3,
          sf_make = $4,
          sf_model = $5,
          updated_at = now()
      WHERE hash = $6
    `, [labelMake, labelModel, year || null, sfMake || null, sfModel || null, hash]);
    
    // Update provider mappings
    const providers = [
      { code: 'iat', make: iatMake, model: iatModel },
      { code: 'rokstone', make: rokstoneMake, model: rokstoneModel },
      { code: 'oraero', make: oraeroMake, model: oraeroModel }
    ];
    
    for (const provider of providers) {
      const providerResult = await client.query('SELECT id FROM providers WHERE code = $1', [provider.code]);
      if (providerResult.rows.length > 0) {
        const providerId = providerResult.rows[0].id;
        
        if (provider.make && provider.model) {
          // Upsert mapping
          await client.query(`
            INSERT INTO model_provider_mappings (model_id, provider_id, provider_make, provider_model)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (model_id, provider_id) DO UPDATE
            SET provider_make = EXCLUDED.provider_make,
                provider_model = EXCLUDED.provider_model,
                updated_at = now()
          `, [modelId, providerId, provider.make, provider.model]);
        } else {
          // Delete mapping if both are empty
          await client.query(`
            DELETE FROM model_provider_mappings
            WHERE model_id = $1 AND provider_id = $2
          `, [modelId, providerId]);
        }
      }
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Model updated', hash });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: error.message });
  } finally {
    await client.end().catch(() => {});
  }
});

// Delete a model
app.delete('/api/models/:hash', authenticate, async (req, res) => {
  const { hash } = req.params;
  const client = getPgClient();
  
  try {
    await client.connect();
    const result = await client.query('DELETE FROM models WHERE hash = $1 RETURNING id', [hash]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    res.json({ message: 'Model deleted', hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await client.end().catch(() => {});
  }
});

// Bulk export - Get all models grouped by make
app.get('/api/export', authenticate, async (req, res) => {
  const client = getPgClient();
  
  try {
    await client.connect();
    
    const makes = await client.query(`
      SELECT id, slug, name FROM makes ORDER BY LOWER(name)
    `);
    
    const result = {};
    
    for (const make of makes.rows) {
      const models = await client.query(`
        SELECT 
          m.hash,
          m.label_make as "labelMake",
          m.label_model as "labelModel",
          m.year,
          m.sf_make as "sfMake",
          m.sf_model as "sfModel",
          json_agg(
            json_build_object(
              'providerCode', p.code,
              'providerMake', mpm.provider_make,
              'providerModel', mpm.provider_model
            ) ORDER BY p.code
          ) FILTER (WHERE p.id IS NOT NULL) as providers
        FROM models m
        WHERE m.make_id = $1
        GROUP BY m.id
        ORDER BY m.year ASC NULLS LAST, m.label_model ASC
      `, [make.id]);
      
      result[make.slug] = models.rows.map(row => {
        const model = {
          hash: row.hash,
          labelMake: row.labelMake,
          labelModel: row.labelModel,
          year: row.year,
          sfMake: row.sfMake || '',
          sfModel: row.sfModel || '',
          iatMake: '',
          iatModel: '',
          rokstoneMake: '',
          rokstoneModel: '',
          oraeroMake: '',
          oraeroModel: ''
        };
        
        if (row.providers) {
          for (const provider of row.providers) {
            model[`${provider.providerCode}Make`] = provider.providerMake || '';
            model[`${provider.providerCode}Model`] = provider.providerModel || '';
          }
        }
        
        return model;
      });
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await client.end().catch(() => {});
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[RDS API Server] Running on port ${PORT}`);
  console.log(`[RDS API Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[RDS API Server] Database: ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`);
  console.log(`[RDS API Server] Authentication: ${process.env.API_AUTH_TOKEN ? 'Enabled' : 'Using default token'}`);
});


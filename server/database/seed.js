const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    console.log('Adapting to existing database schema...\n');

    // Check schema and adapt
    const usersCols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    const userColumns = usersCols.rows.map(r => r.column_name);
    const usesPasswordHash = userColumns.includes('password_hash');
    const usesFullName = userColumns.includes('full_name');
    const usesUUID = userColumns.includes('id') && (await pool.query("SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'")).rows[0].data_type === 'uuid';

    console.log('Schema detection:');
    console.log(`  - Uses password_hash: ${usesPasswordHash}`);
    console.log(`  - Uses full_name: ${usesFullName}`);
    console.log(`  - Uses UUID: ${usesUUID}\n`);

    // Clear existing data (be careful - only clear seeded data)
    console.log('Clearing existing seeded data...');
    try {
      await pool.query("DELETE FROM users WHERE username LIKE 'manager%' OR username LIKE 'supervisor%' OR username LIKE 'worker%'");
      await pool.query("DELETE FROM projects WHERE name IN ('Downtown Office Complex', 'Residential Apartment Building', 'Shopping Mall Renovation')");
      await pool.query("DELETE FROM tasks WHERE title IN ('Foundation Excavation', 'Concrete Pouring', 'Steel Frame Installation', 'Site Preparation', 'Plumbing Installation', 'Demolition Work')");
    } catch (error) {
      console.log('Note: Some cleanup operations failed, continuing...');
    }

    // Seed Users
    console.log('Seeding users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = [
      { username: 'manager1', email: 'manager1@example.com', first_name: 'John', last_name: 'Manager', role: 'manager' },
      { username: 'supervisor1', email: 'supervisor1@example.com', first_name: 'Jane', last_name: 'Supervisor', role: 'supervisor' },
      { username: 'supervisor2', email: 'supervisor2@example.com', first_name: 'Bob', last_name: 'Supervisor', role: 'supervisor' },
      { username: 'worker1', email: 'worker1@example.com', first_name: 'Alice', last_name: 'Worker', role: 'worker' },
      { username: 'worker2', email: 'worker2@example.com', first_name: 'Charlie', last_name: 'Worker', role: 'worker' },
      { username: 'worker3', email: 'worker3@example.com', first_name: 'David', last_name: 'Worker', role: 'worker' },
      { username: 'worker4', email: 'worker4@example.com', first_name: 'Emma', last_name: 'Worker', role: 'worker' },
    ];

    const userIds = {};
    for (const user of users) {
      // Check if user exists
      const existing = await pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
      if (existing.rows.length > 0) {
        userIds[user.username] = existing.rows[0].id;
        console.log(`  User already exists: ${user.username}`);
      } else {
        let query, params;
        if (usesPasswordHash && usesFullName) {
          // Our schema
          const id = usesUUID ? uuidv4() : 'DEFAULT';
          query = `INSERT INTO users (${usesUUID ? 'id, ' : ''}username, password_hash, email, full_name, role, is_active, created_at)
                   VALUES (${usesUUID ? '$1, ' : ''}$2, $3, $4, $5, $6, true, NOW())
                   RETURNING id, username`;
          params = usesUUID 
            ? [id, user.username, hashedPassword, user.email, `${user.first_name} ${user.last_name}`, user.role]
            : [user.username, hashedPassword, user.email, `${user.first_name} ${user.last_name}`, user.role];
        } else {
          // Existing schema
          const id = usesUUID ? uuidv4() : 'DEFAULT';
          query = `INSERT INTO users (${usesUUID ? 'id, ' : ''}username, password, email, first_name, last_name, role, is_active, created_at)
                   VALUES (${usesUUID ? '$1, ' : ''}$2, $3, $4, $5, $6, $7, true, NOW())
                   RETURNING id, username`;
          params = usesUUID
            ? [id, user.username, hashedPassword, user.email, user.first_name, user.last_name, user.role]
            : [user.username, hashedPassword, user.email, user.first_name, user.last_name, user.role];
        }
        
        const result = await pool.query(query, params);
        userIds[user.username] = result.rows[0].id;
        console.log(`  Created user: ${user.username} (ID: ${result.rows[0].id})`);
      }
    }

    // Seed Projects
    console.log('\nSeeding projects...');
    const projects = [
      {
        name: 'Downtown Office Complex',
        description: 'Construction of a 10-story office building in downtown area',
        location: '123 Main Street, Downtown',
        start_date: '2024-01-15',
        end_date: '2024-12-31',
        supervisor_id: userIds['supervisor1'],
        status: 'active'
      },
      {
        name: 'Residential Apartment Building',
        description: '5-story residential apartment complex with 50 units',
        location: '456 Oak Avenue, Suburb',
        start_date: '2024-02-01',
        end_date: '2025-06-30',
        supervisor_id: userIds['supervisor2'],
        status: 'active'
      },
      {
        name: 'Shopping Mall Renovation',
        description: 'Complete renovation of existing shopping mall',
        location: '789 Commerce Blvd, City Center',
        start_date: '2023-11-01',
        end_date: '2024-08-15',
        supervisor_id: userIds['supervisor1'],
        status: 'active'
      }
    ];

    // Check projects table structure
    const projectsCols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'projects'
    `);
    const projectColumns = projectsCols.rows.map(r => r.column_name);
    const hasSupervisorId = projectColumns.includes('supervisor_id');
    const hasCreatedBy = projectColumns.includes('created_by');

    const projectIds = {};
    for (const project of projects) {
      const existing = await pool.query('SELECT id FROM projects WHERE name = $1', [project.name]);
      if (existing.rows.length > 0) {
        projectIds[project.name] = existing.rows[0].id;
        console.log(`  Project already exists: ${project.name}`);
      } else {
        let query, params;
        const id = usesUUID ? uuidv4() : 'DEFAULT';
        
        if (hasSupervisorId) {
          query = `INSERT INTO projects (${usesUUID ? 'id, ' : ''}name, description, location, start_date, end_date, supervisor_id, status, created_at)
                   VALUES (${usesUUID ? '$1, ' : ''}$2, $3, $4, $5, $6, $7, $8, NOW())
                   RETURNING id, name`;
          params = usesUUID
            ? [id, project.name, project.description, project.location, project.start_date, project.end_date, project.supervisor_id, project.status]
            : [project.name, project.description, project.location, project.start_date, project.end_date, project.supervisor_id, project.status];
        } else if (hasCreatedBy) {
          query = `INSERT INTO projects (${usesUUID ? 'id, ' : ''}name, description, location, start_date, end_date, created_by, status, created_at)
                   VALUES (${usesUUID ? '$1, ' : ''}$2, $3, $4, $5, $6, $7, $8, NOW())
                   RETURNING id, name`;
          params = usesUUID
            ? [id, project.name, project.description, project.location, project.start_date, project.end_date, project.supervisor_id, project.status]
            : [project.name, project.description, project.location, project.start_date, project.end_date, project.supervisor_id, project.status];
        } else {
          query = `INSERT INTO projects (${usesUUID ? 'id, ' : ''}name, description, location, start_date, end_date, status, created_at)
                   VALUES (${usesUUID ? '$1, ' : ''}$2, $3, $4, $5, $6, $7, NOW())
                   RETURNING id, name`;
          params = usesUUID
            ? [id, project.name, project.description, project.location, project.start_date, project.end_date, project.status]
            : [project.name, project.description, project.location, project.start_date, project.end_date, project.status];
        }
        
        const result = await pool.query(query, params);
        projectIds[project.name] = result.rows[0].id;
        console.log(`  Created project: ${project.name} (ID: ${result.rows[0].id})`);
      }
    }

    // Seed Tasks
    console.log('\nSeeding tasks...');
    const tasksCols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tasks'
    `);
    const taskColumns = tasksCols.rows.map(r => r.column_name);
    const taskHasProjectId = taskColumns.includes('project_id');
    const taskHasSiteId = taskColumns.includes('site_id');
    const taskHasCreatedBy = taskColumns.includes('created_by');
    const taskHasAssignedBy = taskColumns.includes('assigned_by');
    const taskHasCompletionPercentage = taskColumns.includes('completion_percentage');

    const tasks = [
      {
        title: 'Foundation Excavation',
        description: 'Excavate foundation area for main building',
        project_id: projectIds['Downtown Office Complex'],
        assigned_to: userIds['worker1'],
        created_by: userIds['supervisor1'],
        priority: 'high',
        due_date: '2024-02-15',
        status: 'completed',
        completion_percentage: 100
      },
      {
        title: 'Concrete Pouring',
        description: 'Pour concrete for foundation and first floor',
        project_id: projectIds['Downtown Office Complex'],
        assigned_to: userIds['worker2'],
        created_by: userIds['supervisor1'],
        priority: 'urgent',
        due_date: '2024-02-28',
        status: 'in_progress',
        completion_percentage: 65
      },
      {
        title: 'Steel Frame Installation',
        description: 'Install steel frame structure for building',
        project_id: projectIds['Downtown Office Complex'],
        assigned_to: userIds['worker1'],
        created_by: userIds['supervisor1'],
        priority: 'high',
        due_date: '2024-03-15',
        status: 'pending',
        completion_percentage: 0
      },
      {
        title: 'Site Preparation',
        description: 'Clear site and prepare for construction',
        project_id: projectIds['Residential Apartment Building'],
        assigned_to: userIds['worker3'],
        created_by: userIds['supervisor2'],
        priority: 'medium',
        due_date: '2024-02-20',
        status: 'in_progress',
        completion_percentage: 80
      },
      {
        title: 'Plumbing Installation',
        description: 'Install plumbing systems for all units',
        project_id: projectIds['Residential Apartment Building'],
        assigned_to: userIds['worker4'],
        created_by: userIds['supervisor2'],
        priority: 'high',
        due_date: '2024-04-30',
        status: 'pending',
        completion_percentage: 0
      },
      {
        title: 'Demolition Work',
        description: 'Remove old fixtures and structures',
        project_id: projectIds['Shopping Mall Renovation'],
        assigned_to: userIds['worker1'],
        created_by: userIds['supervisor1'],
        priority: 'medium',
        due_date: '2024-01-31',
        status: 'completed',
        completion_percentage: 100
      }
    ];

    // If tasks use site_id, we need to create sites or use existing ones
    let siteIds = {};
    if (taskHasSiteId && !taskHasProjectId) {
      console.log('  Tasks use site_id - checking for sites table...');
      const sitesCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sites'
      `);
      
      if (sitesCheck.rows.length > 0) {
        // Create sites from projects or use existing
        for (const [projectName, projectId] of Object.entries(projectIds)) {
          const existingSite = await pool.query('SELECT id FROM sites WHERE name = $1 OR id = $2', [projectName, projectId]);
          if (existingSite.rows.length > 0) {
            siteIds[projectName] = existingSite.rows[0].id;
          } else {
            // Try to create a site
            try {
              const siteResult = await pool.query(
                `INSERT INTO sites (id, name, description, location, created_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 RETURNING id`,
                [projectId, projectName, `Site for ${projectName}`, 'Location TBD']
              );
              siteIds[projectName] = siteResult.rows[0].id;
            } catch (error) {
              console.log(`  Could not create site for ${projectName}, skipping tasks for this project`);
            }
          }
        }
      }
    }

    let tasksCreated = 0;
    for (const task of tasks) {
      const id = usesUUID ? uuidv4() : 'DEFAULT';
      let query, params;
      
      let projectField, projectValue;
      if (taskHasProjectId) {
        projectField = 'project_id';
        projectValue = task.project_id;
      } else if (taskHasSiteId) {
        projectField = 'site_id';
        // Find the project name for this task's project_id
        const projectName = Object.keys(projectIds).find(key => projectIds[key] === task.project_id);
        projectValue = siteIds[projectName];
        if (!projectValue) {
          console.log(`  Skipping task ${task.title} - no corresponding site found`);
          continue;
        }
      } else {
        console.log(`  Skipping task ${task.title} - no project_id or site_id column`);
        continue;
      }
      
      const createdByField = taskHasCreatedBy ? 'created_by' : (taskHasAssignedBy ? 'assigned_by' : null);
      
      if (!createdByField) {
        console.log(`  Skipping task ${task.title} - missing created_by/assigned_by column`);
        continue;
      }

      const baseFields = [`${usesUUID ? 'id, ' : ''}title, description, ${projectField}, assigned_to, ${createdByField}, priority, due_date, status`];
      const baseValues = usesUUID 
        ? [`$1, $2, $3, $4, $5, $6, $7, $8, $9`]
        : [`$1, $2, $3, $4, $5, $6, $7, $8`];
      
      if (taskHasCompletionPercentage) {
        baseFields[0] += ', completion_percentage';
        baseValues[0] = usesUUID ? `$1, $2, $3, $4, $5, $6, $7, $8, $9, $10` : `$1, $2, $3, $4, $5, $6, $7, $8, $9`;
      }
      
      baseFields[0] += ', created_at';
      baseValues[0] += ', NOW()';
      
      query = `INSERT INTO tasks (${baseFields[0]}) VALUES (${baseValues[0]})`;
      
      if (taskHasCompletionPercentage) {
        params = usesUUID
          ? [id, task.title, task.description, projectValue, task.assigned_to, task.created_by, task.priority, task.due_date, task.status, task.completion_percentage]
          : [task.title, task.description, projectValue, task.assigned_to, task.created_by, task.priority, task.due_date, task.status, task.completion_percentage];
      } else {
        params = usesUUID
          ? [id, task.title, task.description, projectValue, task.assigned_to, task.created_by, task.priority, task.due_date, task.status]
          : [task.title, task.description, projectValue, task.assigned_to, task.created_by, task.priority, task.due_date, task.status];
      }
      
      try {
        await pool.query(query, params);
        tasksCreated++;
      } catch (error) {
        console.log(`  Error creating task ${task.title}: ${error.message}`);
      }
    }
    console.log(`  Created ${tasksCreated} tasks`);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nSample login credentials:');
    console.log('  Manager: manager1 / password123');
    console.log('  Supervisor: supervisor1 / password123');
    console.log('  Worker: worker1 / password123');
    console.log('  Admin: admin / admin123');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\nSeeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;

const pool = require('./config/database');

async function checkConstraints() {
  try {
    // Check foreign key constraints for clans table
    const constraints = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name, 
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu 
        ON tc.constraint_name = kcu.constraint_name 
      JOIN information_schema.constraint_column_usage AS ccu 
        ON ccu.constraint_name = tc.constraint_name 
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'clans'
    `);
    
    console.log('Foreign key constraints for clans table:');
    constraints.rows.forEach(row => {
      console.log(`- ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    
    // Check clan_members table constraints
    const memberConstraints = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name, 
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu 
        ON tc.constraint_name = kcu.constraint_name 
      JOIN information_schema.constraint_column_usage AS ccu 
        ON ccu.constraint_name = tc.constraint_name 
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'clan_members'
    `);
    
    console.log('\nForeign key constraints for clan_members table:');
    memberConstraints.rows.forEach(row => {
      console.log(`- ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkConstraints();
import 'dotenv/config';

import mongoose from 'mongoose';

import { env } from '@/common/utils/envConfig';

import { seedDAPAAnalyses } from './dapa-analyses/seeder';
import { seedRolesAndPermissions } from './roles-permissions/seeder';
import { seedSEOProjects } from './seo-projects/seeder';
import { seedUsers } from './users/seeder';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await mongoose.connection.db.dropDatabase();
    // console.log('🗑️  Cleared existing database');

    // Seed roles and permissions first (required for users)
    const { roles } = await seedRolesAndPermissions();
    console.log(`✅ Seeded ${roles.length} roles`);

    // Seed users (requires roles)
    console.log('\n📝 Seeding users...');
    const users = await seedUsers();
    console.log(`✅ Seeded ${users.length} users`);

    // Seed SEO projects (requires users)
    console.log('\n📝 Seeding SEO projects...');
    const projects = await seedSEOProjects(users);
    console.log(`✅ Seeded ${projects.length} SEO projects`);

    // Seed DA/PA analyses (requires users and optionally projects)
    console.log('\n📝 Seeding DA/PA analyses...');
    const analyses = await seedDAPAAnalyses(users, projects);
    console.log(`✅ Seeded ${analyses.length} DA/PA analyses`);

    console.log('\n🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

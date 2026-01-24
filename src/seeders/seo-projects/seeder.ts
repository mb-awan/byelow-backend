import { Document, Types } from 'mongoose';

import { ISEOProject, SEOProject } from '@/common/models/seoProject';
import type { IUserDoc } from '@/common/models/user';

const sampleProjects = [
  {
    name: 'My Blog',
    domain: 'myblog.com',
    healthScore: 85,
    status: 'active' as const,
  },
  {
    name: 'E-commerce Store',
    domain: 'mystore.com',
    healthScore: 72,
    status: 'active' as const,
  },
  {
    name: 'Portfolio Website',
    domain: 'portfolio.dev',
    healthScore: 65,
    status: 'active' as const,
  },
  {
    name: 'Company Site',
    domain: 'company.io',
    healthScore: 90,
    status: 'active' as const,
  },
  {
    name: 'Old Project',
    domain: 'oldproject.net',
    healthScore: 45,
    status: 'archived' as const,
  },
];

export const seedSEOProjects = async (users: IUserDoc[]) => {
  const projects: (Document<unknown, object, ISEOProject, object, object> &
    ISEOProject &
    Required<{ _id: Types.ObjectId }> & { __v: number })[] = [];

  if (users.length === 0) {
    console.log('⚠️  No users found, skipping project seeding');
    return projects;
  }

  // Distribute projects among users
  for (let i = 0; i < sampleProjects.length; i++) {
    const projectData = sampleProjects[i];
    const userId = users[i % users.length]._id;

    // Check if project already exists for this user
    const existingProject = await SEOProject.findOne({
      userId,
      domain: projectData.domain,
    });

    if (existingProject) {
      console.log(`⏭️  Project ${projectData.domain} already exists for user, skipping...`);
      projects.push(existingProject);
      continue;
    }

    const project = new SEOProject({
      ...projectData,
      userId,
    });

    await project.save();
    projects.push(project);
    console.log(`✅ Created project: ${projectData.name} (${projectData.domain})`);
  }

  return projects;
};

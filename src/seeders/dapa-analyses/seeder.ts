import { DAPAAnalysis } from '@/common/models/dapaAnalysis';
import type { ISEOProject } from '@/common/models/seoProject';
import type { IUserDoc } from '@/common/models/user';

const sampleDomains = ['example.com', 'test-site.com', 'demo-website.com', 'sample-domain.com', 'mywebsite.io'];

// Generate realistic-looking DA/PA analysis data
const generateAnalysisData = (domain: string) => {
  const domainAuthority = Math.floor(Math.random() * 50) + 30; // 30-80
  const pageAuthority = Math.floor(Math.random() * 10) + (domainAuthority - 10); // PA usually close to DA
  const totalBacklinks = Math.floor(Math.random() * 2000) + 500;
  const referringDomains = Math.floor(totalBacklinks * 0.3);
  const dofollowLinks = Math.floor(totalBacklinks * 0.7);
  const nofollowLinks = totalBacklinks - dofollowLinks;
  const spamScore = Math.floor(Math.random() * 10);
  const organicTrafficEstimate = Math.floor(Math.random() * 20000) + 5000;

  const topBacklinks = [
    { domain: 'techcrunch.com', domainAuthority: 93, linkType: 'dofollow' as const, anchor: 'innovation' },
    { domain: 'forbes.com', domainAuthority: 95, linkType: 'dofollow' as const, anchor: 'technology' },
    { domain: 'medium.com', domainAuthority: 86, linkType: 'nofollow' as const, anchor: 'startup' },
    { domain: 'reddit.com', domainAuthority: 91, linkType: 'nofollow' as const, anchor: 'discussion' },
    { domain: 'github.com', domainAuthority: 94, linkType: 'dofollow' as const, anchor: 'open source' },
  ].map((link) => ({
    domain: link.domain,
    domainAuthority: link.domainAuthority,
    linkType: link.linkType,
    anchorText: link.anchor,
  }));

  const topAnchorTexts = [
    { text: 'brand name', count: Math.floor(Math.random() * 100) + 50 },
    { text: 'click here', count: Math.floor(Math.random() * 80) + 30 },
    { text: 'homepage', count: Math.floor(Math.random() * 60) + 20 },
    { text: 'technology', count: Math.floor(Math.random() * 40) + 15 },
    { text: 'innovation', count: Math.floor(Math.random() * 30) + 10 },
  ];

  return {
    domain,
    domainAuthority,
    pageAuthority,
    totalBacklinks,
    referringDomains,
    dofollowLinks,
    nofollowLinks,
    spamScore,
    organicTrafficEstimate,
    topBacklinks,
    topAnchorTexts,
  };
};

export const seedDAPAAnalyses = async (users: IUserDoc[], projects: ISEOProject[]) => {
  const analyses = [];

  if (users.length === 0) {
    console.log('⚠️  No users found, skipping DA/PA analysis seeding');
    return analyses;
  }

  // Create analyses for sample domains
  for (let i = 0; i < sampleDomains.length; i++) {
    const domain = sampleDomains[i];
    const userId = users[i % users.length]._id;

    // Optionally associate with a project
    const projectId = projects.length > 0 ? projects[i % projects.length]._id : undefined;

    // Check if analysis already exists
    const existingAnalysis = await DAPAAnalysis.findOne({
      userId,
      domain,
    });

    if (existingAnalysis) {
      console.log(`⏭️  Analysis for ${domain} already exists, skipping...`);
      analyses.push(existingAnalysis);
      continue;
    }

    const analysisData = generateAnalysisData(domain);

    const analysis = new DAPAAnalysis({
      ...analysisData,
      userId,
      projectId,
    });

    await analysis.save();
    analyses.push(analysis);
    console.log(`✅ Created DA/PA analysis for: ${domain}`);
  }

  return analyses;
};



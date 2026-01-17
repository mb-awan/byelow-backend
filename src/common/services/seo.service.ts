import fs from 'fs';

import { dataForSeoClient } from '@/common/utils/dataForSeo.client';

export async function fetchBacklinks(target: string) {
  const response = await dataForSeoClient.post('/backlinks/backlinks/live', [
    {
      target,
      limit: 1000,
      order_by: ['rank,desc'],
    },
  ]);

  return response.data.tasks[0].result[0];
}

export async function fetchRefDomains(target: string) {
  const response = await dataForSeoClient.post('/backlinks/referring_domains/live', [
    {
      target,
      limit: 1000,
    },
  ]);

  return response.data.tasks[0].result[0];
}

export async function fetchAnchors(target: string) {
  const response = await dataForSeoClient.post('/backlinks/anchors/live', [
    {
      target,
      limit: 1000,
    },
  ]);

  return response.data.tasks[0].result[0];
}

export async function fetchDomainRank(target: string) {
  const response = await dataForSeoClient.post('/backlinks/domain_rank/live', [
    {
      target,
    },
  ]);

  return response.data.tasks[0].result[0].domain_rank;
}

export async function fetchBacklinkData(target: string) {
  const [backlinks, domains, anchors, rank] = await Promise.all([
    dataForSeoClient.post('/backlinks/backlinks/live', [
      {
        target,
        limit: 1000,
      },
    ]),
    dataForSeoClient.post('/backlinks/referring_domains/live', [
      {
        target,
        limit: 1000,
      },
    ]),
    dataForSeoClient.post('/backlinks/anchors/live', [
      {
        target,
        limit: 1000,
      },
    ]),
    dataForSeoClient.post('/backlinks/domain_rank/live', [
      {
        target,
      },
    ]),
  ]);

  // I want to write these results in a temp text file generated on run time if not there
  fs.writeFileSync('temp_backlinks.txt', JSON.stringify(backlinks.data, null, 2));
  fs.writeFileSync('temp_domains.txt', JSON.stringify(domains.data, null, 2));
  fs.writeFileSync('temp_anchors.txt', JSON.stringify(anchors.data, null, 2));
  fs.writeFileSync('temp_rank.txt', JSON.stringify(rank.data, null, 2));

  // const res = await dataForSeoClient.get("/appendix/status");

  // console.log("Status Response:", res.data);

  // return {
  //   backlinks: 
  // }

  return {
    backlinks: backlinks.data.tasks[0].result[0],
    domains: domains.data.tasks[0].result[0],
    anchors: anchors.data.tasks[0].result[0],
    domainRank: rank.data.tasks[0].result[0].domain_rank,
  };
}

import { prisma } from '@/lib/prisma'

export async function getLatestSlackConnectionForOrganization(organizationId: string) {
  return prisma.slackConnection.findFirst({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      organizationId: true,
      teamId: true,
      teamName: true,
      botTokenEncrypted: true,
      updatedAt: true,
    },
  })
}

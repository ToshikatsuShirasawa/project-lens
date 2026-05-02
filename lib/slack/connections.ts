import { prisma } from '@/lib/prisma'

export async function getSlackUserConnectionForProjectUser(args: {
  userId: string
  organizationId: string
}) {
  return prisma.slackUserConnection.findUnique({
    where: {
      userId_organizationId: {
        userId: args.userId,
        organizationId: args.organizationId,
      },
    },
    select: {
      id: true,
      organizationId: true,
      teamId: true,
      teamName: true,
      slackUserId: true,
      slackUserName: true,
      userTokenEncrypted: true,
      updatedAt: true,
    },
  })
}

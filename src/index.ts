import { Probot, Context } from 'probot'
import dotenv from 'dotenv';
dotenv.config();
import { PullRequestEvent, PullRequestReviewEvent } from '@octokit/webhooks-types'
import { request } from 'https';
import { URL } from 'url';

async function sendToSlack(webhookUrl: string, prTitle: string, prUrl: string, action: string, labelName: string, whoLabeled: string) {
  if (webhookUrl === undefined) {
    console.error('webhook_url is not defined');
    return;
  }

  const text = `\`${prTitle}\`
- A pull request has been ${action}
  - ${prUrl}
  - reason: \`${labelName}\`
- ${whoLabeled}: Please provide the reason why in this thread`;

    const url = new URL(webhookUrl);
    const data = JSON.stringify({
        text
    });

    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise<void>((resolve, reject) => {
        const req = request(options, res => {
            if (res.statusCode! >= 200 && res.statusCode! < 300) {
                resolve();
            } else {
                reject(new Error(`Url: ${webhookUrl}, Received status code: ${res.statusCode}`));
            }
        });

        req.on('error', (error) => {
            console.error('Error sending message to Slack:', error);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}
module.exports = (app: Probot) => {
  app.on(['pull_request.opened', 'pull_request.reopened', 'pull_request.labeled', 'pull_request.edited', 'pull_request_review'], async (context) => {
    context.log('Repo: %s', context.payload.repository.full_name)

    const pr = context.payload.pull_request
    context.log('PR: %s', pr.html_url)
    context.log('Action: %s', context.payload.action)

    // NOTE(dabrady) When a PR is first opened, it can fire several different kinds of events if the author e.g. requests
    // reviewers or adds labels during creation. This triggers parallel runs of our GitHub App, so we need to filter out
    // those simultaneous events and focus just on the re/open event in this scenario.
    //
    // These simultaneous events contain the same pull request data in their payloads, and specify the 'updated at'
    // timestamp to be the same as the 'created at' timestamp for the pull request. We can use this to distinguish events
    // that are fired during creation from events fired later on.
    if (!['opened', 'reopened'].includes(context.payload.action) && pr.created_at === pr.updated_at) {
      context.log('Ignoring additional creation event: %s', context.payload.action)
      return
    }

    // reading configuration
    const config: any = await context.config('autoapproval.yml')
    context.log(config, '\n\nLoaded config')

    // determine if the PR has any "blacklisted" labels
    const prLabels: string[] = pr.labels.map((label: any) => label.name)
    let blacklistedLabels: string[] = []
    if (config.blacklisted_labels !== undefined) {
      blacklistedLabels = config.blacklisted_labels
        .filter((blacklistedLabel: any) => prLabels.includes(blacklistedLabel))

      // if PR contains any black listed labels, do not proceed further
      if (blacklistedLabels.length > 0) {
        context.log('PR black listed from approving: %s', blacklistedLabels)
        return
      }
    }

    // config.webhook_url can be undeifned if the user didn't set it in the config file
    const webhook_url = config.webhook_url || process.env.SLACK_WEBHOOK_URL;

    // reading pull request owner info and check it with configuration
    const ownerSatisfied = config.from_owner.length === 0 || config.from_owner.includes(pr.user.login)

    // reading pull request labels and check them with configuration
    let requiredLabelsSatisfied
    let triggeringLabel: string | null = null;

    if (config.required_labels_mode === 'one_of') {
      // one of the required_labels needs to be applied
      const appliedRequiredLabels = config.required_labels
        .filter((requiredLabel: any) => prLabels.includes(requiredLabel))
      requiredLabelsSatisfied = appliedRequiredLabels.length > 0
      triggeringLabel = appliedRequiredLabels.length > 0 ? appliedRequiredLabels[0] : null;
    } else {
      // all of the required_labels need to be applied
      const missingRequiredLabels = config.required_labels
        .filter((requiredLabel: any) => !prLabels.includes(requiredLabel))
      requiredLabelsSatisfied = missingRequiredLabels.length === 0
      triggeringLabel = prLabels.find((label: string) => config.required_labels.includes(label)) || null;
    }

    if (requiredLabelsSatisfied && ownerSatisfied) {
      const reviews = await getAutoapprovalReviews(context)
      const whoLabeled = context.payload.sender?.login || 'icedac'; // the person who triggered the event or 'unknown' as a fallback

      let slackUserId = null;

      // Check if slack_user_mapping exists in the configuration before accessing it
      if (config.slack_user_mapping) {
        slackUserId = config.slack_user_mapping[whoLabeled] || null;
      }
      // Check if a Slack user ID exists in the user mapping. If not, provide a fallback message.
      const mention = slackUserId ? `<@${slackUserId}>` : `\`PLEASE UPDATE USER MAPPING in autoapproval.yml\`: GITHUB_ID is \`${whoLabeled}\``;
      // Check if the event was triggered by a bot
      const isBot = whoLabeled.endsWith('[bot]');
 
      if (reviews.length > 0) {
        context.log('PR has already reviews')
        if (context.payload.action === 'dismissed') {
          await applyAutoMerge(context, prLabels, config.auto_merge_labels, config.auto_rebase_merge_labels, config.auto_squash_merge_labels)
          approvePullRequest(context)
          applyLabels(context, config.apply_labels as string[])
          context.log('Review was dismissed, approve again')
          if (!isBot) await sendToSlack(webhook_url!, pr.title, pr.html_url, 're-approved', triggeringLabel!, mention);
        }
      } else {
        await applyAutoMerge(context, prLabels, config.auto_merge_labels, config.auto_rebase_merge_labels, config.auto_squash_merge_labels)
        approvePullRequest(context)
        applyLabels(context, config.apply_labels as string[])
        context.log('PR approved first time')
        if (!isBot) await sendToSlack(webhook_url!, pr.title, pr.html_url, 're-approved', triggeringLabel!, mention);
      }
    } else {
      // one of the checks failed
      context.log('Condition failed! \n - missing required labels: %s\n - PR owner found: %s', requiredLabelsSatisfied, ownerSatisfied)
    }
  })
}

async function approvePullRequest (context: Context) {
  const prParams = context.pullRequest({ event: 'APPROVE' as const, body: 'Approved :+1:' })
  await context.octokit.pulls.createReview(prParams)
}

async function applyLabels (context: Context, labels: string[]) {
  // if there are labels required to be added, add them
  if (labels.length > 0) {
    // trying to apply existing labels to PR. If labels didn't exist, this call will fail
    const labelsParam = context.issue({ labels: labels })
    await context.octokit.issues.addLabels(labelsParam)
  }
}

function applyAutoMerge (context: Context, prLabels: string[], mergeLabels: string[], rebaseLabels: string[], squashLabels: string[]) {
  if (mergeLabels && prLabels.filter((label: any) => mergeLabels.includes(label)).length > 0) {
    enableAutoMerge(context, 'MERGE')
  }
  if (rebaseLabels && prLabels.filter((label: any) => rebaseLabels.includes(label)).length > 0) {
    enableAutoMerge(context, 'REBASE')
  }
  if (squashLabels && prLabels.filter((label: any) => squashLabels.includes(label)).length > 0) {
    enableAutoMerge(context, 'SQUASH')
  }
}

const enableAutoMergeMutation = `
  mutation($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) {
    enablePullRequestAutoMerge(input:{
      pullRequestId: $pullRequestId,
      mergeMethod: $mergeMethod
    }) {
      pullRequest {
        id,
        autoMergeRequest {
          mergeMethod
        }
      }
    }
  }
`

async function enableAutoMerge (context: Context, method: string) {
  context.log('Auto merging with merge method %s', method)
  const payload = context.payload as PullRequestEvent | PullRequestReviewEvent

  await context.octokit.graphql(enableAutoMergeMutation, {
    pullRequestId: payload.pull_request.node_id,
    mergeMethod: method
  })
}

async function getAutoapprovalReviews (context: Context): Promise<any> {
  const pr = context.pullRequest()
  const reviews = await context.octokit.pulls.listReviews(pr)

  const autoapprovalReviews = (reviews.data).filter((item: any) => item.user.login === 'autoapproval[bot]')

  return autoapprovalReviews
}

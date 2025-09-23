// You can import your modules
// import index from '../src/index'

import exp from 'constants';
import nock from 'nock'
import dotenv from 'dotenv';
dotenv.config();

// Requiring our app implementation
const myProbotApp = require('../src')
const { Probot, ProbotOctokit } = require('probot')

 
const SLACK_URL_TEST_ANYTHING = process.env.SLACK_WEBHOOK_TEST;
console.log('SLACK_WEBHOOK_TEST: ', process.env.SLACK_WEBHOOK_TEST);
console.log('SLACK_WEBHOOK_URL: ', process.env.SLACK_WEBHOOK_URL);
process.env.SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_TEST;


nock.disableNetConnect()

describe('Autoapproval bot', () => {
  let probot: any

  beforeEach(() => {
    probot = new Probot({
      githubToken: 'test',
      // Disable throttling & retrying requests for easier testing
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false }
      })
    })
    myProbotApp(probot)
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  test('PR has missing blacklisted_labels -> will be approved', async () => {
    const payload = require('./fixtures/pull_request.opened.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels:\n  - merge\napply_labels: []'
    const reviews = require('./fixtures/pull_request_reviews_empty.json')

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/pulls/1/reviews')
      .reply(200, reviews)

    nock('https://api.github.com')
      .post('/repos/dkhmelenko/autoapproval/pulls/1/reviews', (body: any) => {
        return body.event === 'APPROVE'
      })
      .reply(200)

      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
        .post('')
        .reply(200, 'ok');

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(nock.isDone()).toBeTruthy()
  })

  test('PR has blacklisted labels -> will NOT be approved', async () => {
    const payload = require('./fixtures/pull_request.opened.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels:\n  - merge\nblacklisted_labels:\n  - wip\napply_labels: []'

    const testNock = nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
      .post('')
      .reply(200, 'ok');

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(testNock.isDone()).toBeTruthy()
  })

  test('PR has no required labels -> will NOT be approved', async () => {
    const payload = require('./fixtures/pull_request.opened.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels:\n  - ready\nblacklisted_labels: []\napply_labels: []'

    const testNock = nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
      .post('')
      .reply(200, 'ok');

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(testNock.isDone()).toBeTruthy()
  })
 
  test('PR has not all required labels -> will NOT be approved', async () => {
    const payload = require('./fixtures/pull_request.opened.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels:\n  - ready\n  - ready2\nblacklisted_labels: []\napply_labels: []'

    const testNock = nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
        .post('')
        .reply(200, 'ok');

        // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(testNock.isDone()).toBeTruthy()
  })

  test('PR has no expected owner -> will NOT be approved', async () => {
    const payload = require('./fixtures/pull_request.opened.json')
    const config = 'from_owner:\n  - blabla\nrequired_labels:\n  - merge\nblacklisted_labels: []\napply_labels: []'

    const testNock = nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)
 
      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
        .post('')
        .reply(200, 'ok');

        // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(testNock.isDone()).toBeTruthy()
  })

  test('PR has required labels and expected owner -> will be approved', async () => {
    const payload = require('./fixtures/pull_request.opened.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels:\n  - merge\nblacklisted_labels: []\napply_labels: []'
    const reviews = require('./fixtures/pull_request_reviews_empty.json')

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/pulls/1/reviews')
      .reply(200, reviews)

    nock('https://api.github.com')
      .post('/repos/dkhmelenko/autoapproval/pulls/1/reviews', (body: any) => {
        return body.event === 'APPROVE'
      })
      .reply(200)
      
      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
        .post('')
        .reply(200, 'ok');

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(nock.isDone()).toBeTruthy()
  })

  test('PR has multiple required labels and expected owner -> will be approved', async () => {
    const payload = require('./fixtures/pull_request_opened_multiple_labels.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels:\n  - merge\n  - merge2\nblacklisted_labels: []\napply_labels: []'
    const reviews = require('./fixtures/pull_request_reviews_empty.json')

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/pulls/1/reviews')
      .reply(200, reviews)

    nock('https://api.github.com')
      .post('/repos/dkhmelenko/autoapproval/pulls/1/reviews', (body: any) => {
        return body.event === 'APPROVE'
      })
      .reply(200)

      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
      .post('')
      .reply(200, 'ok');

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(nock.isDone()).toBeTruthy()
  })

  //////////////////////////
  ///// webhook test
  /////////////////////////
  test('PR has one of multiple required labels and expected owner -> will be approved', async () => {
    const payload = require('./fixtures/pull_request_opened_multiple_labels.json')
    const webhook_url = SLACK_URL_TEST_ANYTHING
    const config = `
from_owner:
  - dkhmelenko\nrequired_labels:
  - merge
  - merge2
required_labels_mode: one_of
blacklisted_labels: []
apply_labels: []
webhook_url: ${SLACK_URL_TEST_ANYTHING}
slack_user_mapping:
  icedac: "U03BPTX6CNB"
  dkhmelenko: "U03BPTX6CNB"
`;
    const reviews = require('./fixtures/pull_request_reviews_empty.json')

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/pulls/1/reviews')
      .reply(200, reviews)

    const testNock = nock('https://api.github.com')
      .post('/repos/dkhmelenko/autoapproval/pulls/1/reviews', (body: any) => {
        return body.event === 'APPROVE'
      })
      .reply(200)

    /*
      const slackNock = nock(webhook_url!)
      .post('')
      .reply(200, 'ok');
    //*/

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(testNock.isDone()).toBeTruthy()
  })

  test('PR approved and label is applied', async () => {
    const payload = require('./fixtures/pull_request.opened.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels: []\nblacklisted_labels: []\napply_labels:\n  - done'

    const reviews = require('./fixtures/pull_request_reviews_empty.json')

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/pulls/1/reviews')
      .reply(200, reviews)

    nock('https://api.github.com')
      .post('/repos/dkhmelenko/autoapproval/pulls/1/reviews', (body: any) => {
        return body.event === 'APPROVE'
      })
      .reply(200)

      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
      .post('')
      .reply(200, 'ok');

    nock('https://api.github.com')
      .post('/repos/dkhmelenko/autoapproval/issues/1/labels', (body: any) => {
        return body.labels.includes('done')
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(nock.isDone()).toBeTruthy()
  })

  test('PR approved and auto merge is enabled', async () => {
    const payload = require('./fixtures/pull_request.opened.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels: []\nblacklisted_labels: []\napply_labels: []\nauto_merge_labels:\n  - merge'

    const reviews = require('./fixtures/pull_request_reviews_empty.json')

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/pulls/1/reviews')
      .reply(200, reviews)

    nock('https://api.github.com')
      .post('/repos/dkhmelenko/autoapproval/pulls/1/reviews', (body: any) => {
        return body.event === 'APPROVE'
      })
      .reply(200)

    const testNock = nock('https://api.github.com')
      .post('/graphql', (body: any) => {
        return body.variables.pullRequestId === 'MDExOlB1bGxSZXF1ZN0NjExMzU2MTgy' &&
           body.variables.mergeMethod === 'MERGE'
      })
      .reply(200)

      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
        .post('')
        .reply(200, 'ok');

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(testNock.isDone()).toBeTruthy()
  })

  test('PR approved and auto merge squash is enabled', async () => {
    const payload = require('./fixtures/pull_request.opened.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels: []\nblacklisted_labels: []\napply_labels: []\nauto_squash_merge_labels:\n  - merge'

    const reviews = require('./fixtures/pull_request_reviews_empty.json')

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/pulls/1/reviews')
      .reply(200, reviews)

    nock('https://api.github.com')
      .post('/repos/dkhmelenko/autoapproval/pulls/1/reviews', (body: any) => {
        return body.event === 'APPROVE'
      })
      .reply(200)

    const testNock = nock('https://api.github.com')
      .post('/graphql', (body: any) => {
        return body.variables.pullRequestId === 'MDExOlB1bGxSZXF1ZN0NjExMzU2MTgy' &&
           body.variables.mergeMethod === 'SQUASH'
      })
      .reply(200)

      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
        .post('')
        .reply(200, 'ok');

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(testNock.isDone()).toBeTruthy()
  })

  test('PR approved and auto merge rebase is enabled', async () => {
    const payload = require('./fixtures/pull_request.opened.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels: []\nblacklisted_labels: []\napply_labels: []\nauto_rebase_merge_labels:\n  - merge'

    const reviews = require('./fixtures/pull_request_reviews_empty.json')

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/pulls/1/reviews')
      .reply(200, reviews)

    nock('https://api.github.com')
      .post('/repos/dkhmelenko/autoapproval/pulls/1/reviews', (body: any) => {
        return body.event === 'APPROVE'
      })
      .reply(200)

    const testNock = nock('https://api.github.com')
      .post('/graphql', (body: any) => {
        return body.variables.pullRequestId === 'MDExOlB1bGxSZXF1ZN0NjExMzU2MTgy' &&
           body.variables.mergeMethod === 'REBASE'
      })
      .reply(200)

      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
        .post('')
        .reply(200, 'ok');

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(testNock.isDone()).toBeTruthy()
  })

  test('PR is already approved -> will NOT be approved again', async () => {
    const payload = require('./fixtures/pull_request.opened.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels: []\nblacklisted_labels: []\napply_labels:\n  - merge'
    const reviews = require('./fixtures/pull_request_reviews.json')

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

    const testNock = nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/pulls/1/reviews')
      .reply(200, reviews)

      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
        .post('')
        .reply(200, 'ok');

    // Receive a webhook event
    await probot.receive({ name: 'pull_request_review', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(testNock.isDone()).toBeTruthy()
  })

  test('Autoapproval review was dismissed -> approve PR again', async () => {
    const payload = require('./fixtures/pull_request_review.dismissed.json')
    const config = 'from_owner:\n  - dkhmelenko\nrequired_labels: []\nblacklisted_labels: []\napply_labels:\n  - merge'
    const reviews = require('./fixtures/pull_request_reviews.json')

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/contents/.github%2Fautoapproval.yml')
      .reply(200, config)

    nock('https://api.github.com')
      .get('/repos/dkhmelenko/autoapproval/pulls/1/reviews')
      .reply(200, reviews)

    nock('https://api.github.com')
      .post('/repos/dkhmelenko/autoapproval/pulls/1/reviews', (body: any) => {
        return body.event === 'APPROVE'
      })
      .reply(200)

    const testNock = nock('https://api.github.com')
      .post('/repos/dkhmelenko/autoapproval/issues/1/labels', (body: any) => {
        return body.labels.includes('merge')
      })
      .reply(200)

      const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
        .post('')
        .reply(200, 'ok');

    // Receive a webhook event
    await probot.receive({ name: 'pull_request_review', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
    expect(testNock.isDone()).toBeTruthy()
  })

  test('PR labeled when opening -> label event is ignored', async () => {
    const payload = require('./fixtures/pull_request.labeled.on_open.json')

    const slackNock = nock(process.env.SLACK_WEBHOOK_URL!)
    .post('')
    .reply(200, 'ok');

        // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload })

    await new Promise(process.nextTick) // Don't assert until all async processing finishes
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with Nock see:
// https://github.com/nock/nock

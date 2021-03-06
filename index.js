'use strict'

const BbPromise = require('bluebird')
const fs = require('fs')
const path = require('path')
const setBucketName = require('serverless/lib/plugins/aws/lib/setBucketName')
const ref = {}

class AWSNestedStacks {
    constructor(serverless, options) {
        const self = this
        ref.self = self
        this.serverless = serverless
        this.service = serverless.service
        this.serverlessLog = serverless.cli.log.bind(serverless.cli)
        this.options = options
        this.provider = this.serverless.getProvider('aws')
        Object.assign(self, setBucketName)

        this.hooks = {
            'before:package:finalize': self.createNestedStackCfn,
            'before:aws:deploy:deploy:updateStack': () => BbPromise.bind(this)
                .then(self.setBucketName)
                .then(self.uploadNestedTemplates)
        }
    }

    getBaseUrl() {
        var baseUrl
        const service = ref.self.serverless.service.service
        const stage = ref.self.options.stage
        if (ref.self.serverless.service.provider.deploymentBucket) {
            baseUrl = 'https://s3.amazonaws.com/' + ref.self.serverless.service.provider.deploymentBucket + `/serverless/${service}/${stage}`
        } else {
            baseUrl = {
                'Fn::Sub': 'https://s3.amazonaws.com/${ServerlessDeploymentBucket}' + `/serverless/${service}/${stage}`
            }
        }
        return baseUrl
    }

    getTemplateUrl(baseUrl, stack) {
        var templateUrl
        if (typeof baseUrl === 'object') {
            templateUrl = baseUrl
            templateUrl['Fn::Sub'] += `/${stack.template}`
        } else {
            templateUrl = baseUrl + `/${stack.template}`
        }
        return templateUrl
    }

    mergeArray(array) {
        let tagObj = {}
        if (Array.isArray(array)) {
            for (let item of array) {
                Object.assign(tagObj, item)
            }
        } else {
            tagObj = array
        }
        return tagObj
    }

    generateTags(stack) {
        let tags = []
        stack.tags = ref.self.mergeArray(stack.tags)
        for (let property in stack.tags) {
            if (stack.tags.hasOwnProperty(property)) {
                let newTag = {}
                newTag.Key = property
                newTag.Value = stack.tags[property]
                tags.push(newTag)
            }
        }
        return tags
    }

    createNestedStackCfn() {
        ref.self.serverlessLog('Creating nested stacks in Cloudformation...')
        let stacks = ref.self.serverless.service.custom['nested-stacks'].stacks
        if (stacks) {
            const baseUrl = ref.self.getBaseUrl()
            let resources = ref.self.serverless.service.provider.compiledCloudFormationTemplate.Resources
            for (let stack of stacks) {
                if (stack && stack.id && stack.template) {
                    ref.self.serverlessLog('Stack: ' + stack.template)
                    resources[stack.id] = {
                        'Type': 'AWS::CloudFormation::Stack',
                        'Properties': {
                            'TemplateURL': ref.self.getTemplateUrl(baseUrl, stack)
                        }
                    }
                    if (stack.notifications) {
                        resources[stack.id].Properties.NotificationARNs = stack.notifications
                    }
                    if (stack.parameters) {
                        let params = ref.self.mergeArray(stack.parameters)
                        resources[stack.id].Properties.Parameters = params
                    }
                    if (stack.tags) {
                        let tags = ref.self.generateTags(stack)
                        resources[stack.id].Properties.Tags = tags
                    }
                    if (stack.timeout) {
                        resources[stack.id].Properties.TimeoutInMinutes = stack.timeout
                    }
                } else {
                    var msg = 'Missing required properties for nested stack:\n'
                    msg += '\tid - Logical ID of the nested stack\n'
                    msg += '\ttemplate - the name of the nested cloudformation templates'
                    throw new Error(msg)
                }
            }
        }
    }

    uploadNestedTemplates() {
        ref.self.serverlessLog('Uploading nested stacks to S3...')
        const service = ref.self.serverless.service.service
        const stage = ref.self.options.stage
        const self = this
        let templateFolder = ref.self.serverless.service.custom['nested-stacks'].location || '.'
        let stacks = ref.self.serverless.service.custom['nested-stacks'].stacks
        for (let stack of stacks) {
            ref.self.serverlessLog('Stack: ' + stack.template)
            let body = fs.readFileSync(path.join(templateFolder, stack.template), 'utf8')
            let params = {
                Bucket: self.bucketName,
                Key: `serverless/${service}/${stage}/${stack.template}`,
                Body: body,
                ContentType: 'application/json'
            }
            ref.self.provider.request('S3', 'putObject', params, ref.self.options.stage, ref.self.options.region)
        }
    }
}
module.exports = AWSNestedStacks

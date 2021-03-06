# serverless-plugin-nested-stacks
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

Nested stacks for the Serverless Framework!

## Intro

Write your nested stacks as regular cloudformation and easily integrate them with the Serverless Framework!  

This plugin handles:

* Adding the appropriate **AWS::Cloudformation::Stack** type resources to the generated sls cloudformation template.
* Uploading your nested stacks to your designated S3 deployment bucket.

## Configuration Reference

```
custom:
  nested-stacks:
    location: nested-stacks                      # Where do you keep your nested stacks?
    stacks:
      - id: MyGroovyNestedStack                  # Logical ID (Required)
        template: nested-template.yml            # Template file name (Required)
        timeout: 60                              # Minutes before stack creation times out.
        parameters:                              # Stack parameters as key value pairs
          - InstanceType: t1.micro
          - BlahBlah: abc123
        tags:                                    # Stack tags
          - ${file(nested-stacks/core-tags.yml)} # Load tags from a file?
          - CustomTag: Yolo
        notifications:                           # Notification ARN's for SNS
          - arn:aws:sns:region:account-id:topicname

```
* **custom.nested-stacks.location** - (Required) Organisation is important.  Keep all your nested stacks in one place and use this attribute to define where that place is.
* **custom.nested-stacks.stacks** - (Required) Your very own list of nested stack definitions!
* **custom.nested-stacks.stacks.id** - (Required) The logical ID of the nested stack resource.
* **custom.nested-stacks.stacks.template** - (Required) The file name of the nested stack.  Remember, this file must exist in the directory defined by _custom.nested-stacks.location_.
* **custom.nested-stacks.stacks.timeout** - Time in minutes before the stack creation times out.
* **custom.nested-stacks.stacks.parameters** - A list of key value pairs to be passed into the nested stack as parameters.
* **custom.nested-stacks.stacks.tags** - A list of key value pairs to be passed into the nested stack as its tags.
* **custom.nested-stacks.stacks.notifications** - A list of existing Amazon SNS topics where notifications about stack events are sent.

## Want to know more?

Read the AWS Cloudformation documentation for [AWS::Cloudformation::Stack](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-stack.html) resources!

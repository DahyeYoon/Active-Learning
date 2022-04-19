import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam'
// import {readFileSync} from 'fs';
export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly vpc2: ec2.IVpc;
  public readonly securityGroup: ec2.ISecurityGroup;
  public readonly publicSubnetA: ec2.PublicSubnet;
  public readonly publicSubnetC: ec2.PublicSubnet;


  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'AL-Vpc', {
        cidr: '10.0.0.0/16',
        enableDnsSupport: true,
        enableDnsHostnames: true,
        maxAzs: 1,
        natGateways: 0,
        subnetConfiguration: []
    });

    const publicSubnetA = new ec2.PublicSubnet(this, 'PublicSubnetA', {
        availabilityZone: 'ap-northeast-2a',
        cidrBlock: '10.0.10.0/24',
        vpcId: vpc.vpcId,
        mapPublicIpOnLaunch: true,
        // routeTableId: vpc.defaultRouteTable.routeTableId
      });
    const publicSubnetC = new ec2.PublicSubnet(this, 'PublicSubnetC', {
        availabilityZone: 'ap-northeast-2c',
        cidrBlock: '10.0.20.0/24',
        vpcId: vpc.vpcId,
    });


    //   const privateSubnetA = new ec2.PrivateSubnet(this, 'PrivateSubnetA', {
    //     availabilityZone: 'ap-northeast-2a',
    //     cidrBlock: '10.0.10.0/24',
    //     vpcId: vpc.vpcId,
    //   });
    //   const privateSubnetC = new ec2.PrivateSubnet(this, 'PrivateSubnetC', {
    //     availabilityZone: 'ap-northeast-2c',
    //     cidrBlock: '10.0.20.0/24',
    //     vpcId: vpc.vpcId,
   
    //   });

      const instanceSG = new ec2.SecurityGroup(this, 'InstanceSG', {
        vpc: vpc,
        description: 'security group for instance servers',
        securityGroupName: 'InstanceSG',
        allowAllOutbound: true,
    });
    instanceSG.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(22),
        'allow SSH access from anywhere',
      );
 
      instanceSG.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(80),
        'allow HTTP traffic from anywhere',
      );
 
    const webserverRole = new iam.Role(this, 'webserver-role', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
        ],
        });

      const ec2Instance = new ec2.Instance(this, 'ec2-instance', {
        vpc:vpc,
        vpcSubnets: {
            // subnetType: ec2.SubnetType.PUBLIC,
            // subnets: [privateSubnetA, privateSubnetC],
            subnets: [publicSubnetA, publicSubnetC],
          },
        role: webserverRole,
        securityGroup: instanceSG,
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T2,
          ec2.InstanceSize.MICRO,
        ),
        // machineImage: new ec2.AmazonLinuxImage({
        //   generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        // }),
        machineImage: new ec2.GenericLinuxImage({
            'ap-northeast-2': 'ami-0ed11f3863410c386'
          }),
        keyName: 'ec2-key-pair',
      });


  }
}
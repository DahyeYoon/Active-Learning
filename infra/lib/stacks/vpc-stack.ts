import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam'
// import {readFileSync} from 'fs';

interface IRouteTable {
 routeTableId: string
}
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

 const cfnRouteTable = new ec2.CfnRouteTable(this, 'CfnRouteTable', {
 vpcId: vpc.vpcId,
 });
 const ddb_cfnVPCEndpoint = new ec2.CfnVPCEndpoint(this, 'DDBCfnVPCEndpoint', {
    serviceName: 'com.amazonaws.ap-northeast-2.dynamodb',
    vpcId: vpc.vpcId,
   });
const s3_cfnVPCEndpoint = new ec2.CfnVPCEndpoint(this, 'S3CfnVPCEndpoint', {
    serviceName: 'com.amazonaws.ap-northeast-2.s3',
    vpcId: vpc.vpcId,
   });


 const publicSubnetA = new ec2.PublicSubnet(this, 'PublicSubnetA', {
 availabilityZone: 'ap-northeast-2a',
 cidrBlock: '10.0.10.0/24',
 vpcId: vpc.vpcId,
 mapPublicIpOnLaunch: true,
 });
  const publicSubnetC = new ec2.PublicSubnet(this, 'PublicSubnetC', {
 availabilityZone: 'ap-northeast-2c',
 cidrBlock: '10.0.20.0/24',
 vpcId: vpc.vpcId,
 });



 const vpcIgw = new ec2.CfnInternetGateway(this, 'vpc-igw')

 const vpcIgwAttachment = new ec2.CfnVPCGatewayAttachment(this,
 'vpc-igwattach',
 {
 internetGatewayId : vpcIgw.ref,
 vpcId : vpc.vpcId
 }
)

publicSubnetA.addDefaultInternetRoute(
 vpcIgw.ref,
 vpcIgwAttachment
 )

 publicSubnetC.addDefaultInternetRoute(
 vpcIgw.ref,
 vpcIgwAttachment
 )

 //   const privateSubnetA = new ec2.PrivateSubnet(this, 'PrivateSubnetA', {
 //     availabilityZone: 'ap-northeast-2a',
 //     cidrBlock: '10.0.10.0/24',
 //     vpcId: vpc.vpcId,
 //   });
 //   const privateSubnetC = new ec2.PrivateSubnet(this, 'PrivateSubnetC', {
 //     availabilityZone: 'ap-northeast-2c',
 //     cidrBlock: '10.0.20.0/24',
 //     vpcId: vpc.vpcId,

 //   });

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

 const rdp_ec2Instance = new ec2.Instance(this, 'rdp_ec2-instance', {
    vpc:vpc,
    vpcSubnets: {
    subnets: [publicSubnetA, publicSubnetC],
    },
    role: webserverRole,
    securityGroup: instanceSG,
    instanceType: ec2.InstanceType.of(
    ec2.InstanceClass.T2,
    ec2.InstanceSize.MICRO,
    ),
    machineImage: new ec2.GenericLinuxImage({
    'ap-northeast-2': 'ami-0ed11f3863410c386'
    }),
    keyName: 'ec2-key-pair',
    });

 const tr_ec2Instance = new ec2.Instance(this, 'tr_ec2-instance', {
 vpc:vpc,
 vpcSubnets: {
 // subnetType: ec2.SubnetType.PUBLIC,
 // subnets: [privateSubnetA, privateSubnetC],
 subnets: [publicSubnetA, publicSubnetC],
 },
 role: webserverRole,
 securityGroup: instanceSG,
 instanceType: ec2.InstanceType.of(
// ec2.InstanceClass.G4DN,
// ec2.InstanceSize.XLARGE16,
 ec2.InstanceClass.T2,
 ec2.InstanceSize.MICRO,
 ),
 // machineImage: new ec2.AmazonLinuxImage({
 //   generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
 // }),
 machineImage: new ec2.GenericLinuxImage({
 'ap-northeast-2': 'ami-0ed11f3863410c386'
 }),
 keyName: 'ec2-key-pair',
 });

 const infer_ec2Instance = new ec2.Instance(this, 'infer_ec2-instance', {
    vpc:vpc,
    vpcSubnets: {
    // subnets: [privateSubnetA, privateSubnetC],
    subnets: [publicSubnetA, publicSubnetC],
    },
    role: webserverRole,
    securityGroup: instanceSG,
    instanceType: ec2.InstanceType.of(
    // ec2.InstanceClass.G4DN,
    // ec2.InstanceSize.XLARGE16,
    ec2.InstanceClass.T2,
    ec2.InstanceSize.MICRO,
    ),
    machineImage: new ec2.GenericLinuxImage({
    'ap-northeast-2': 'ami-0ed11f3863410c386'
    }),
    keyName: 'ec2-key-pair',
    });


// --------------------------------------
 }
}

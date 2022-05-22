import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2'
import { HttpAlbIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';

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

      // ---------------- subnets ----------------

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

      const privateSubnetA = new ec2.PrivateSubnet(this, 'PrivateSubnetA', {
         availabilityZone: 'ap-northeast-2a',
         cidrBlock: '10.0.30.0/24',
         vpcId: vpc.vpcId,
      });
      const privateSubnetC = new ec2.PrivateSubnet(this, 'PrivateSubnetC', {
         availabilityZone: 'ap-northeast-2c',
         cidrBlock: '10.0.40.0/24',
         vpcId: vpc.vpcId,
      });

      // -------------------------------------------------

      // ------ IGW & Route-----------------
      const vpcIgw = new ec2.CfnInternetGateway(this, 'vpc-igw')

      const vpcIgwAttachment = new ec2.CfnVPCGatewayAttachment(this,
         'vpc-igwattach',
         {
            internetGatewayId: vpcIgw.ref,
            vpcId: vpc.vpcId
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
      //----- NatGW -----------------
      const ngw = publicSubnetA.addNatGateway();
      privateSubnetA.addDefaultNatRoute(ngw.ref);
      privateSubnetC.addDefaultNatRoute(ngw.ref);
      // -------------------------------------------------
      // ------ SGs -----------------
      const albSG = new ec2.SecurityGroup(this, 'alb-sg', {
         vpc: vpc,
         description: 'security group for alb',
         securityGroupName: 'AlbSG',
         allowAllOutbound: true,
      });
      albSG.addIngressRule(
         ec2.Peer.anyIpv4(),
         ec2.Port.tcp(80),
         'allow HTTP access',
      );
      const instanceSG = new ec2.SecurityGroup(this, 'instance-sg', {
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
      // -------------------------------------------------

      const userData = ec2.UserData.forOperatingSystem(ec2.OperatingSystemType.LINUX);

      userData.addCommands(
         'sudo su',
         'apt update',
         'python3 run.py',
      );

      // ------ EC2 Instances -----------------
      const webserverRole = new iam.Role(this, 'webserver-role', {
         assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
         managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
         ],
      });
      const ec2Instance_rdp = new ec2.Instance(this, 'ec2-instance-rdp', {
         vpc: vpc,
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
      const ec2Instance_t = new ec2.Instance(this, 'ec2-instance-tr', {
         vpc: vpc,
         vpcSubnets: {
            subnets: [privateSubnetA],
            // subnets: [publicSubnetA, publicSubnetC],
         },
         role: webserverRole,
         securityGroup: instanceSG,
         instanceType: ec2.InstanceType.of(
            // ec2.InstanceClass.G4DN,
            // ec2.InstanceSize.XLARGE16,
            ec2.InstanceClass.T2,
            ec2.InstanceSize.MICRO,
         ),
         userData,
         machineImage: new ec2.GenericLinuxImage({
            'ap-northeast-2': 'ami-0ed11f3863410c386'
         }),
         keyName: 'ec2-key-pair',
      });
      const ec2Instance_i = new ec2.Instance(this, 'ec2-instance-infer', {
         vpc: vpc,
         vpcSubnets: {
            subnets: [privateSubnetC],
            // subnets: [publicSubnetA, publicSubnetC],
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
         userData,
         keyName: 'ec2-key-pair',
      });
      // -------------------------------------------------
      // ------ ALB -----------------

      const albtarget_t = new elbv2.ApplicationTargetGroup(this, 'albtarget-tr', {
         targetGroupName: 'AlbtgTr',
         port: 80,
         protocol: elbv2.ApplicationProtocol.HTTP,
         targetType: elbv2.TargetType.INSTANCE,
         targets: [new elbv2.InstanceTarget(ec2Instance_t.instanceId)],
         vpc: vpc
      });

      const alb_t = new elbv2.ApplicationLoadBalancer(this, 'alb-tr', {
         vpc: vpc,
         internetFacing: true,
         vpcSubnets: {
            subnets: [publicSubnetA,publicSubnetC]
         },
         securityGroup: albSG
      });

      const listener_t = alb_t.addListener('listener-tr', { port: 80 });

      listener_t.addTargetGroups('TargetTr', {
         targetGroups: [albtarget_t]
      });

      //  const httpEndpoint = new apigwv2.HttpApi(this, 'HttpProxyPrivateApi', {
      //    defaultIntegration: new HttpAlbIntegration('DefaultIntegration', listener),
      //  });

      const albtarget_i = new elbv2.ApplicationTargetGroup(this, 'albtg-infer', {
         targetGroupName: 'AlbtgInfer',
         port: 80,
         protocol: elbv2.ApplicationProtocol.HTTP,
         targetType: elbv2.TargetType.INSTANCE,
         targets: [new elbv2.InstanceTarget(ec2Instance_i.instanceId)],
         vpc: vpc
      });

      const alb_i = new elbv2.ApplicationLoadBalancer(this, 'alb-infer', {
         vpc: vpc,
         internetFacing: true,
         vpcSubnets: {
            subnets: [publicSubnetA, publicSubnetC]
         },
         securityGroup: albSG
      });

      const listener_i = alb_i.addListener('listener-infer', { port: 80 });

      listener_i.addTargetGroups('TargetInfer', {
         targetGroups: [albtarget_i]
      });
      // --------------------------------------
   }
}

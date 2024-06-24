# Website deployment to AWS EKS Clusters 

## Steps Followed:
1. Create EKS clusters with 3 nodes
2. Create a dockeriamge for the application
3. Create IAM roles for deployment and to access the cluster
4. Configure the necessary deployemt files for the service to be deployed.
5. Create AWS load balancer by deploying the ingress and access the website.

## Setup AWS .

1. Download aws-cli in your local
```
curl "https://s3.amazonaws.com/aws-cli/awscli-bundle.zip" -o "awscli-bundle.zip"
unzip awscli-bundle.zip
sudo ./awscli-bundle/install -i /usr/local/aws -b /usr/local/bin/aws
```
2. Install Kubernetes 
3. Create EKS in AWS with 3 nodes. 
4. Verify if the cluster is running by the following command : 
```
aws eks --region ap-south-1 describe-cluster --name cluster1 --query cluster.status
```
5. Configure your Kubeconfig to point towards the newly created cluster via the following command
```
aws eks --region ap-south-1 update-kubeconfig --name cluster-test
```
## Step 1 : Create the Docker Image. 

### Dockerfile

```
# Use an official Node.js runtime as a parent image
FROM node:latest

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json index.js app.js /app/
COPY routes/index.js /app/routes/

# Install any needed dependencies specified in package.json
RUN npm install express socket.io

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 6041

# Define the command to run the app
CMD ["npm", "start"]

```
- Build the docker image
  
```
  command to build the docker image - docker build -t sounak3007/assignment-boilerplate:demo2 .
  command to push the docker image to docker hub - docker push sounak3007/assignment-boilerplate:demo2 
```

## Step2: Design Kubernetes deployment:

Write a deployment yaml file for the application to be deployed in the kubernetes cluster.

file path - ./EKS-deployment/kubedeploy.yaml

### Deploymemt file :

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: assignment-boilerplate-deploymemt
  labels:
    app: assignment-boilerplate
  annotations: 
    sidecar.speedscale.com/cpu-request: 200m
    sidecar.speedscale.com/cpu-limit: 500m
spec:
  replicas: 1
  selector:
    matchLabels:
      app: assignment-boilerplate
  template:
    metadata:
      labels:
        app: assignment-boilerplate
    spec:
      containers:
        - name: assignment-boilerplate
          image: docker.io/sounak3007/assignment-boilerplate:demo2
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 6041
              protocol: TCP
          resources:
            requests:
              cpu: "100m"
              memory: "100Mi"
              # ephemeral-storage: "100Mi"
            limits:
              cpu: "500m"
              memory: "700Mi"
              # ephemeral-storage: "700Mi"

```
## Implement Kubernetes service:

- Kubernetes service type NodePort deployment yaml :
  
```
apiVersion: v1
kind: Service
metadata:
  name: assignment-boilerplate-svc
  labels:
    app: assignment-boilerplate    
spec:
  type: NodePort
  ports:
    - port: 6041
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app: assignment-boilerplate
```
## Step 3 : Configure application auto-scaling:

- Install metrics server for the HPA
  ```
  kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
  
- Configure yaml file for Horizontal Pod autoscaler.
  
  Values file path for deployment - ./EKS-deploy/HPA.yaml

yaml file config :
  
```
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: assignment-boilerplate-deploymemt
  minReplicas: 1
  maxReplicas: 3
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60

   ```

- Deploy the pod to kubernetes using the following command :
  
```
  kubectl apply -f ./kubedeploy/k8-deploy.yaml
  kubectl apply -f ./kubedeploy/HPA.yaml
```  
- test autoscaling
```
  kubectl exec -it <pod-name> -- bash -c " while sleep 0.01s; do wget http://localhost:6041; done"

```
## Step 4 : Prerequisites for Internet Facing Load Balancer creation:

1. Add tag to the public subnets attached to the EKS cluster and set the value to 1. 
   ```
   tag - kubernetes.io/role/elb 
   ```
2. Create OIDC identity provider for the cluster to allow us to create IAM roles for our service account and access them from our cluster by following the below steps:
   ```
   Copy OIDC URL > IAM > Identity Provider > ADD provider > Open Id Connect > Set Audience - sts.amazonaws.com
   ```
3. Create IAM policy for the Load Balancer - loadbalancer-controller-policy
   
   ```
   {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "iam:CreateServiceLinkedRole"
            ],
            "Resource": "*",
            "Condition": {
                "StringEquals": {
                    "iam:AWSServiceName": "elasticloadbalancing.amazonaws.com"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeAccountAttributes",
                "ec2:DescribeAddresses",
                "ec2:DescribeAvailabilityZones",
                "ec2:DescribeInternetGateways",
                "ec2:DescribeVpcs",
                "ec2:DescribeVpcPeeringConnections",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeInstances",
                "ec2:DescribeNetworkInterfaces",
                "ec2:DescribeTags",
                "ec2:GetCoipPoolUsage",
                "ec2:DescribeCoipPools",
                "elasticloadbalancing:DescribeLoadBalancers",
                "elasticloadbalancing:DescribeLoadBalancerAttributes",
                "elasticloadbalancing:DescribeListeners",
                "elasticloadbalancing:DescribeListenerCertificates",
                "elasticloadbalancing:DescribeSSLPolicies",
                "elasticloadbalancing:DescribeRules",
                "elasticloadbalancing:DescribeTargetGroups",
                "elasticloadbalancing:DescribeTargetGroupAttributes",
                "elasticloadbalancing:DescribeTargetHealth",
                "elasticloadbalancing:DescribeTags"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "cognito-idp:DescribeUserPoolClient",
                "acm:ListCertificates",
                "acm:DescribeCertificate",
                "iam:ListServerCertificates",
                "iam:GetServerCertificate",
                "waf-regional:GetWebACL",
                "waf-regional:GetWebACLForResource",
                "waf-regional:AssociateWebACL",
                "waf-regional:DisassociateWebACL",
                "wafv2:GetWebACL",
                "wafv2:GetWebACLForResource",
                "wafv2:AssociateWebACL",
                "wafv2:DisassociateWebACL",
                "shield:GetSubscriptionState",
                "shield:DescribeProtection",
                "shield:CreateProtection",
                "shield:DeleteProtection"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:AuthorizeSecurityGroupIngress",
                "ec2:RevokeSecurityGroupIngress"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:CreateSecurityGroup"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:CreateTags"
            ],
            "Resource": "arn:aws:ec2:*:*:security-group/*",
            "Condition": {
                "StringEquals": {
                    "ec2:CreateAction": "CreateSecurityGroup"
                },
                "Null": {
                    "aws:RequestTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:CreateTags",
                "ec2:DeleteTags"
            ],
            "Resource": "arn:aws:ec2:*:*:security-group/*",
            "Condition": {
                "Null": {
                    "aws:RequestTag/elbv2.k8s.aws/cluster": "true",
                    "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:AuthorizeSecurityGroupIngress",
                "ec2:RevokeSecurityGroupIngress",
                "ec2:DeleteSecurityGroup"
            ],
            "Resource": "*",
            "Condition": {
                "Null": {
                    "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:CreateLoadBalancer",
                "elasticloadbalancing:CreateTargetGroup"
            ],
            "Resource": "*",
            "Condition": {
                "Null": {
                    "aws:RequestTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:CreateListener",
                "elasticloadbalancing:DeleteListener",
                "elasticloadbalancing:CreateRule",
                "elasticloadbalancing:DeleteRule"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:AddTags",
                "elasticloadbalancing:RemoveTags"
            ],
            "Resource": [
                "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*",
                "arn:aws:elasticloadbalancing:*:*:loadbalancer/net/*/*",
                "arn:aws:elasticloadbalancing:*:*:loadbalancer/app/*/*"
            ],
            "Condition": {
                "Null": {
                    "aws:RequestTag/elbv2.k8s.aws/cluster": "true",
                    "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:AddTags",
                "elasticloadbalancing:RemoveTags"
            ],
            "Resource": [
                "arn:aws:elasticloadbalancing:*:*:listener/net/*/*/*",
                "arn:aws:elasticloadbalancing:*:*:listener/app/*/*/*",
                "arn:aws:elasticloadbalancing:*:*:listener-rule/net/*/*/*",
                "arn:aws:elasticloadbalancing:*:*:listener-rule/app/*/*/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:ModifyLoadBalancerAttributes",
                "elasticloadbalancing:SetIpAddressType",
                "elasticloadbalancing:SetSecurityGroups",
                "elasticloadbalancing:SetSubnets",
                "elasticloadbalancing:DeleteLoadBalancer",
                "elasticloadbalancing:ModifyTargetGroup",
                "elasticloadbalancing:ModifyTargetGroupAttributes",
                "elasticloadbalancing:DeleteTargetGroup"
            ],
            "Resource": "*",
            "Condition": {
                "Null": {
                    "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:RegisterTargets",
                "elasticloadbalancing:DeregisterTargets"
            ],
            "Resource": "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:SetWebAcl",
                "elasticloadbalancing:ModifyListener",
                "elasticloadbalancing:AddListenerCertificates",
                "elasticloadbalancing:RemoveListenerCertificates",
                "elasticloadbalancing:ModifyRule"
            ],
            "Resource": "*"
        }
    ]
}

4. Create IAM role for the load balancer - loadbalancer-controller-role

```
{
   "Version":"2012-10-17",
   "Statement":[
      {
         "Effect":"Allow",
         "Principal":{
            "Federated":"arn:aws:iam::<accountId>:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/<oidcId>"
         },
         "Action":"sts:AssumeRoleWithWebIdentity",
         "Condition":{
            "StringEquals":{
               "oidc.eks.us-east-1.amazonaws.com/id/<oidcId>:aud":"sts.amazonaws.com",
               "oidc.eks.us-east-1.amazonaws.com/id/<oidcId>:sub":"system:serviceaccount:kube-system:aws-load-balancer-controller"
            }
         }
      }
   ]
}
```

## Step 5 : Configure service account for Load Balancer

```
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/name: aws-load-balancer-controller
  name: aws-load-balancer-controller
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::992382822875:role/loadbalencer-controller-role
```
## Step 6: Use Helm chart to install load balancer controller within your cluster

```
helm repo add eks https://aws.github.io/eks-charts

helm install aws-load-balancer-controller eks/aws-load-balancer-controller -n kube-system --set clusterName=cluster-test --set serviceAccount.create=false --set serviceAccount.name=aws-load-balancer-controller

```

## Step 7 : Ingress file for Internet Facing Load Balancer deployment in AWS :

- Deploying the ingress will crete a load balancer in AWS via which we can acess the site

```
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: assignment-boilerplate-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName: alb
  rules:
    - http:
        paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: assignment-boilerplate-svc
              port:
                number: 6041

```

## Step 8 : Navigate to the load balancer DNS to access the website

  [https://k8s-default-assignme-997a8e79e2-661382993.ap-south-1.elb.amazonaws.com](http://k8s-default-assignme-997a8e79e2-661382993.ap-south-1.elb.amazonaws.com/)


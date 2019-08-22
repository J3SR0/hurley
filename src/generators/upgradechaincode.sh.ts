// tslint:disable:max-line-length
import { BaseGenerator } from './base';
import { join, resolve } from 'path';
import { Organization } from '../models/organization';
import { Channel } from '../models/channel';

export class UpgradeChaincodeShOptions {
    networkRootPath: string;
    orgs: Organization[];
    channel: Channel;
    name: string;
    version: string;
    language: string;
    currentPath: string;
    params: string;
    colConfig?: string;
    hyperledgerVersion: string;
    insideDocker: boolean;
}
export class UpgradeChaincodeShGenerator extends BaseGenerator {
    success = join(this.path, 'tasks/', 'upgradechaincode.sh.successful');
    contents = `
#!/bin/bash
set -e

${this.options.language==='golang' ? `
if [ -z "$GOROOT" ]; then
    echo "Your $GOROOT variable is not set, make sure it points to the path where you installed Go."

    echo "Defaulting to '/usr/local/go'. This may fail depending where you installed your Go. Please set the var accordingly to your environment"

    export GOROOT=/usr/local/go
fi

export GOPATH=${this.options.networkRootPath}

rm -fr  ${this.options.networkRootPath}/src/go_temp_code
mkdir -p ${this.options.networkRootPath}/src/go_temp_code

cp -r ${this.options.currentPath}/ ${this.options.networkRootPath}/src/go_temp_code


${this.options.colConfig ? `
    mkdir -p ${this.options.networkRootPath}/src/go_temp_code/collections
    echo "Looking for collection's config at ${resolve(process.cwd(), this.options.colConfig)}"
    cp -r ${resolve(process.cwd(), this.options.colConfig)} ${this.options.networkRootPath}/src/go_temp_code/collections
` : ``}

`: ``}

export FABRIC_CFG_PATH=${this.options.networkRootPath}/fabric-binaries/${this.options.hyperledgerVersion}/config

set +e
${this.options.orgs.map((org, index) => `
echo "Installing Chaincode ${this.options.name} version ${this.options.version} at ${org.name}"

export CORE_PEER_MSPCONFIGPATH=${this.options.networkRootPath}/artifacts/crypto-config/peerOrganizations/${org.name}.hurley.lab/users/Admin@${org.name}.hurley.lab/msp
export CORE_PEER_ID=peer0.${org.name}.hurley.lab
export CORE_PEER_ADDRESS=${this.options.insideDocker ? `peer0.${org.name}.hurley.lab` : 'localhost'}:${this.options.insideDocker ? '7051' : `${org.peers[0].options.ports[0]}`}
export CORE_PEER_LOCALMSPID=${org.name}MSP
export CORE_PEER_TLS_ROOTCERT_FILE=${this.options.networkRootPath}/artifacts/crypto-config/peerOrganizations/${org.name}.hurley.lab/msp/tlscacerts/tlsca.${org.name}.hurley.lab-cert.pem

${this.options.language==='golang' ? `
${this.options.networkRootPath}/fabric-binaries/${this.options.hyperledgerVersion}/bin/peer chaincode install -n ${this.options.name} -v ${this.options.version} -p "go_temp_code" -l "${this.options.language}"
`:`
${this.options.networkRootPath}/fabric-binaries/${this.options.hyperledgerVersion}/bin/peer chaincode install -n ${this.options.name} -v ${this.options.version} -p "${this.options.currentPath}" -l "${this.options.language}"
`}

echo "Installed Chaincode ${this.options.name} version ${this.options.version}  at ${org.name}"
`).join('')}
set -e

sleep 10

echo "Upgrading Chaincode ${this.options.name} version ${this.options.version} at ${this.options.orgs[0].name} for channel ${this.options.channel.name}"

echo "It may take a few minutes depending on the chaincode dependencies"
export CORE_PEER_MSPCONFIGPATH=${this.options.networkRootPath}/artifacts/crypto-config/peerOrganizations/${this.options.orgs[0].name}.hurley.lab/users/Admin@${this.options.orgs[0].name}.hurley.lab/msp
export CORE_PEER_ID=peer0.${this.options.orgs[0].name}.hurley.lab
export CORE_PEER_ADDRESS=${this.options.insideDocker ? `peer0.${this.options.orgs[0].name}.hurley.lab` : 'localhost'}:${this.options.insideDocker ? '7051' : `${this.options.orgs[0].peers[0].options.ports[0]}`}
export CORE_PEER_LOCALMSPID=${this.options.orgs[0].name}MSP
export CORE_PEER_TLS_ROOTCERT_FILE=${this.options.networkRootPath}/artifacts/crypto-config/peerOrganizations/${this.options.orgs[0].name}.hurley.lab/msp/tlscacerts/tlsca.${this.options.orgs[0].name}.hurley.lab-cert.pem

${this.options.colConfig ? ` echo "Upgrading with collection ${this.options.colConfig}"`: `` }

${this.options.language === 'golang' ? `

${this.options.networkRootPath}/fabric-binaries/${this.options.hyperledgerVersion}/bin/peer chaincode upgrade\
    -C ${this.options.channel.name}\
    -n ${this.options.name}\
    -v ${this.options.version}\
    -c '${this.options.params}'\
    -P "${this.getPolicy(this.options.orgs)}"\
    -o ${this.options.insideDocker ? `orderer.hurley.lab` : 'localhost'}:7050\
    --cafile ${this.options.networkRootPath}/artifacts/crypto-config/ordererOrganizations/hurley.lab/orderers/orderer.hurley.lab/msp/tlscacerts/tlsca.hurley.lab-cert.pem\
    ${this.options.colConfig ? ` --collections-config "$GOPATH/src/go_temp_code/collections/${this.options.colConfig.split('/')[this.options.colConfig.split('/').length - 1]}"` : ``}
    `: `
${this.options.networkRootPath}/fabric-binaries/${this.options.hyperledgerVersion}/bin/peer chaincode upgrade\
    -C ${this.options.channel.name}\
    -n ${this.options.name}\
    -v ${this.options.version}\
    -c '${this.options.params}'\
    -P "${this.getPolicy(this.options.orgs)}"\
    -o ${this.options.insideDocker ? `orderer.hurley.lab` : 'localhost'}:7050\
    --cafile ${this.options.networkRootPath}/artifacts/crypto-config/ordererOrganizations/hurley.lab/orderers/orderer.hurley.lab/msp/tlscacerts/tlsca.hurley.lab-cert.pem\
    ${this.options.colConfig ? ` --collections-config "${resolve(process.cwd(), this.options.colConfig)}"` : ``}
    `}

echo "Upgraded Chaincode at ${this.options.orgs[0].name}"

mkdir -p ${this.options.networkRootPath}/tasks
touch ${this.success}
  `;

    constructor(filename: string, path: string, private options: UpgradeChaincodeShOptions) {
        super(filename, path);
    }

    getPolicy(orgs: Organization[]): string {
        return `OR(${
            orgs
                .map(org => `'${org.name}MSP.member'`)
                .join(',')
            })`;
    }

}
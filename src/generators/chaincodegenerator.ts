import { resolve } from 'path';
import { InstallChaincodeShGenerator } from './installchaincode.sh';
import { UpgradeChaincodeShGenerator } from './upgradechaincode.sh';
import { l } from '../utils/logs';
import { InvokeChaincodeShGenerator } from './invokechaincode.sh';
import { Organization } from '../models/organization';
import { Channel } from '../models/channel';

export class ChaincodeGenerator {
    installScript: InstallChaincodeShGenerator;
    upgradeScript: UpgradeChaincodeShGenerator;
    currentPath = this.options.path ? resolve(process.cwd(), this.options.path) : process.cwd();

    constructor(public name: string, private options: {
        organizations: Organization[];
        channel?: Channel;
        networkRootPath: string;
        language: string;
        params: string;
        colConfig?: string;
        version?: string;
        hyperledgerVersion: string;
        path?: string;
        insideDocker?: boolean;
        debug?: boolean;
    }) {
        this.installScript = new InstallChaincodeShGenerator('installscript.sh', options.networkRootPath, {
            channel: this.options.channel || new Channel('ch1'),
            currentPath: this.currentPath,
            language: options.language,
            name,
            colConfig: this.options.colConfig,
            networkRootPath: options.networkRootPath,
            orgs: options.organizations,
            params: options.params || '{"Args":["init",""]}',
            version: options.version || '1.0',
            hyperledgerVersion: options.hyperledgerVersion,
            insideDocker: this.options.insideDocker,
            debug: this.options.debug
        });
        this.upgradeScript = new UpgradeChaincodeShGenerator('upgradescript.sh', options.networkRootPath, {
            channel: this.options.channel || new Channel('ch1'),
            currentPath: this.currentPath,
            language: options.language,
            name,
            networkRootPath: options.networkRootPath,
            colConfig: this.options.colConfig,
            orgs: options.organizations,
            params: options.params || '{"Args":["init",""]}',
            version: options.version,
            hyperledgerVersion: options.hyperledgerVersion,
            insideDocker: this.options.insideDocker
        });
    }

    async save() {
        await this.installScript.save();
        await this.upgradeScript.save();
    }
    install() {
        l(`installing smart contract located at ${this.currentPath}`);
        return this.installScript.run();
    }
    upgrade() {
        return this.upgradeScript.run();
    }
}
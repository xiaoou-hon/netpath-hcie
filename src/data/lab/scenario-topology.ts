import type { LabScenario } from '@/types';
import type {
  ScenarioTopologyDocument,
  TopologyDevice,
  TopologyInterface,
  TopologyLink,
} from '@/types/ensp';

function mappedPort(value: number | undefined): number {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= 65535 ? Number(value) : 0;
}

function convertInterface(deviceId: string, name: string): TopologyInterface {
  const result: TopologyInterface = { id: `${deviceId}::${name}`, name };
  const match = name.match(/(\d+)\/(\d+)\/(\d+)$/);
  if (match) {
    result.slot = Number(match[1]);
    result.subslot = Number(match[2]);
    result.port = Number(match[3]);
  }
  return result;
}

/** 将预置场景转换为统一静态拓扑；既有角色映射和远程验收数据一并保留。 */
export function scenarioToTopology(
  scenario: LabScenario,
  mappings: Record<string, number> = {},
): ScenarioTopologyDocument {
  const devices: TopologyDevice[] = scenario.devices.map((device) => {
    const model = scenario.ensp?.models[device.id] ?? 'unknown';
    const comPort = mappedPort(mappings[device.id]);
    return {
      id: device.id,
      name: device.sysname || device.name,
      model,
      comPort,
      vrpCapable: comPort !== 0 && !/^(?:PC|Server|Cloud)$/i.test(model),
      boards: [],
      interfaces: device.interfaces.map((item) => convertInterface(device.id, item.name)),
    };
  });

  const scenarioDevices = new Map(scenario.devices.map((device) => [device.id, device]));
  const seenLinks = new Set<string>();
  const links: TopologyLink[] = [];
  for (const device of scenario.devices) {
    for (const link of device.links ?? []) {
      const target = scenarioDevices.get(link.to)!;
      const endpointIds = [
        `${device.id}::${link.localIf}`,
        `${target.id}::${link.remoteIf}`,
      ];
      const key = [...endpointIds].sort().join('|');
      if (seenLinks.has(key)) continue;
      seenLinks.add(key);
      const id = `link-${links.length + 1}`;
      links.push({
        id,
        name: `${device.name}-${target.name}`,
        source: {
          deviceId: device.id,
          interfaceName: link.localIf,
          interfaceId: endpointIds[0],
        },
        target: {
          deviceId: target.id,
          interfaceName: link.remoteIf,
          interfaceId: endpointIds[1],
        },
      });
    }
  }

  return {
    name: scenario.title,
    source: { type: 'preset', scenarioId: scenario.id },
    scenarioId: scenario.id,
    warnings: [],
    devices,
    links,
    checks: (scenario.ensp?.checks ?? []).map((check) => ({ ...check })),
  };
}

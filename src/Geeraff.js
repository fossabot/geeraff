import React, { useState, useEffect } from "react";
import _ from "lodash";
import Draggable from "./Draggable";

import DragContext from "./DragContext";
import DropTarget from "./DropTarget";
import Connector from "./Connector";
import PanZoomSVG from "./PanZoomSVG";
import treeLayout from "./Layouts/TreeLayout";
//import { findStartNodes } from './Util';

/*
let topologicalSort = graph => {
  let associations = _.reduce(
    graph,
    (result, value, key) => {
      result[key] = _.clone(value.children);
      return result;
    },
    {}
  );
  let sortedNodes = [];
  let startNodes = findStartNodes(graph);
  while (!_.isEmpty(startNodes)) {
    let node = startNodes.pop();
    sortedNodes.push(node);
    _.each(associations[node], child => {
      if (
        !_.reduce(
          _.without(_.keys(associations), node),
          (result, key) => _.has(associations[key], child) && result,
          true
        )
      ) {
        startNodes.push(child);
      }
    });
    associations[node] = [];
  }
  if (
    _.reduce(
      associations,
      (result, value) => {
        return result + value.length;
      },
      0
    )
  ) {
    console.debug("ERROR! Graph has cycles", associations, sortedNodes);
    return null;
  } else {
    return sortedNodes;
  }
};
*/

/*
let layout = (graph, topology) => {
  return _.map(topology, (element, index) => {
    return (
      <g transform={`translate(${index * 150 + index * 10}, 20)`}>
        {graph[element].render()}
      </g>
    );
  });
};
*/

/*
let findLongestPath = (graph, startNodes) => {
  if (_.isEmpty(startNodes)) return [];

  let paths = _.map(startNodes, startNode => {
    return _.concat(
      [startNode],
      findLongestPath(graph, graph[startNode].children)
    );
  });
  return _.reduce(paths, (result, path) =>
    result.length < path.length ? path : result
  );
};
*/

const defaults = {
  accessor: node => node, //identity, default to hierarchical data
  type: "node",
  children: node => node.connections,
  key: (node, key) => node.id,
  graphics: node => {
    return {
      bounds: { width: 220, height: 70 },
      render: () => (
        <g>
          <rect width="200" height="50" />
          <text>{node.name}</text>
        </g>
      ),
      inputs: { x: 0, y: 35 },
      outputs: { x: 200, y: 35 },
      connector: (startNode, endNode, graph) => {
        return (
          <Connector
            startX={startNode.x}
            startY={startNode.y}
            endX={endNode.x}
            endY={endNode.y}
            style={{ strokeWidth: "2px", stroke: "black" }}
          />
        );
      }
    };
  }
};

const renderConnections = (graph, layout) => {
  return _.flatMap(
    _.filter(
      _.keys(graph),
      key => graph[key].children && graph[key].children.length
    ),
    key => {
      return _.map(graph[key].children, childKey => {
        if (!layout[key]) return;
        return (
          <g key={`${key}-${childKey}-connector`}>
            {graph[key].graphics.connector(
              {
                x: layout[key].x + graph[key].graphics.outputs.x,
                y: layout[key].y + graph[key].graphics.outputs.y,
                data: graph[key]
              },
              {
                x: layout[childKey].x + graph[childKey].graphics.inputs.x,
                y: layout[childKey].y + graph[childKey].graphics.inputs.y,
                data: graph[childKey]
              },
              graph
            )}
          </g>
        );
      });
    }
  );
};

const render = (graph, layout, setLayout) => {
  return _.map(graph, (node, key) => {
    if (!layout[key]) return;
    return (
      <DropTarget key={key} data={node}>
        <Draggable
          moved={position => {
            let newLayout = _.cloneDeep(layout);
            newLayout[key] = position;
            setLayout(newLayout);
          }}
          x={layout[key].x}
          y={layout[key].y}
          persist={true}
          data={node}
        >
          {node.graphics.render(node)}
        </Draggable>
      </DropTarget>
    );
  });
};

export default props => {
  let nodeTypes = props.nodes ? props.nodes : [defaults];
  let nodes = _.reduce(
    nodeTypes,
    (result, nodeType) => {
      const accessor = _.isFunction(nodeType.accessor)
        ? nodeType.accessor
        : data => data[nodeType.accessor];
      return _.reduce(
        accessor(props.data),
        (result, node, index) => {
          let key = nodeType.key(node, index);
          result[key] = {
            data: node,
            type: nodeType.type,
            key: key,
            graphics: nodeType.graphics(node),
            drop: (dragData, dropData) =>
              nodeType.drop && nodeType.drop(dragData, dropData)
          };
          return result;
        },
        result
      );
    },
    {}
  );
  _.each(nodeTypes, nodeType => {
    const accessor = _.isFunction(nodeType.accessor)
      ? nodeType.accessor
      : data => data[nodeType.accessor];
    return _.each(accessor(props.data), (node, index) => {
      let key = nodeType.key(node, index);
      let children = _.compact(nodeType.children(node, index, props.data));
      _.each(children, child => {
        if (!nodes[child].parents) { 
          nodes[child].parents = [];
        }
        nodes[child].parents.push(key);
      });
      nodes[key].children = children;
    });
  });

  //console.debug(findLongestPath(nodes, findStartNodes(nodes)));
  let [layout, setLayout] = useState({});
  let layouter = props.layout || treeLayout;
  /*
  useEffect(() => {
    setTimeout(() => setLayout(layouter(nodes, layout, setLayout)), 20);
  });//, [props.data]);
  */
  useEffect(() => {
    setLayout(layouter(nodes, layout, setLayout));
  }, [props.data]);
  //console.debug("Rendering!");
  //console.debug(findStartNodes(nodes));
  // {layout(nodes, topology)}
  if (layout) {
    return (
      <PanZoomSVG>
        <DragContext>
          {renderConnections(nodes, layout)}
          {render(nodes, layout, setLayout)}
        </DragContext>
      </PanZoomSVG>
    );
  } else { 
    return null;
  }
};

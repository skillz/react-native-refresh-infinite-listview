/*
 * @providesModule RefreshInfiniteListView
 * @flow
 */

import React from 'react';

import {
  Image,
  View,
  Text,
  StyleSheet,
  ListView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

import PropTypes from 'prop-types';

/*
 * list status change graph
 *
 * STATUS_NONE->[STATUS_REFRESH_IDLE, STATUS_INFINITE_IDLE, STATUS_INFINITE_LOADED_ALL]
 * STATUS_REFRESH_IDLE->[STATUS_NONE, STATUS_WILL_REFRESH]
 * STATUS_WILL_REFRESH->[STATUS_REFRESH_IDLE, STATUS_REFRESHING]
 * STATUS_REFRESHING->[STATUS_NONE]
 * STATUS_INFINITE_IDLE->[STATUS_NONE, STATUS_WILL_INFINITE]
 * STATUS_WILL_INFINITE->[STATUS_INFINITE_IDLE, STATUS_INFINITING]
 * STATUS_INFINITING->[STATUS_NONE]
 * STATUS_INFINITE_LOADED_ALL->[STATUS_NONE]
 *
 */
const STATUS_NONE = 0,
  STATUS_REFRESH_IDLE = 1,
  STATUS_WILL_REFRESH = 2,
  STATUS_REFRESHING = 3,
  STATUS_INFINITE_IDLE = 4,
  STATUS_WILL_INFINITE = 5,
  STATUS_INFINITING = 6,
  STATUS_INFINITE_LOADED_ALL = 7;

const DEFAULT_PULL_DISTANCE = 60;
const DEFAULT_HF_HEIGHT = 50;

export default class RefreshInfiniteListView extends React.Component{
  static propTypes = {
    footerHeight : PropTypes.number,
    pullDistance : PropTypes.number,
    renderEmptyRow : PropTypes.func,
    renderHeaderRefreshIdle : PropTypes.func,
    renderHeaderWillRefresh : PropTypes.func,
    renderHeaderRefreshing : PropTypes.func,
    renderFooterInifiteIdle : PropTypes.func,
    renderFooterWillInifite : PropTypes.func,
    renderFooterInifiting : PropTypes.func,
    renderFooterInifiteLoadedAll : PropTypes.func,
  };

  static defaultProps = {
    footerHeight: DEFAULT_HF_HEIGHT,
    pullDistance: DEFAULT_PULL_DISTANCE,
    renderEmptyRow: (): React.Element => {
      return (
        <View style={{height:Dimensions.get('window').height * 2/3, justifyContent:'center',alignItems:'center'}}>
          <Text style={{fontSize:40, fontWeight:'800', color:'red'}}>
            {'have no data'}
          </Text>
        </View>
      );
    },
    renderHeaderRefreshIdle: (): React.Element => {
      return (
        <View style={{flex:1, height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
          <Text style={styles.text}>
            {'pull down refresh...'}
          </Text>
          <Image source={require('./pull_arrow.png')}
                 resizeMode={Image.resizeMode.stretch}
                 style={styles.image}/>
        </View>
      );
    },
    renderHeaderWillRefresh: (): React.Element => {
      return (
        <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
          <Text style={styles.text}>
            {'release to refresh...'}
          </Text>
          <Image source={require('./pull_arrow.png')}
                 resizeMode={Image.resizeMode.stretch}
                 style={[styles.image, styles.imageRotate]}/>
        </View>
      );
    },
    renderHeaderRefreshing: (): React.Element => {
      return (
        <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
          <Text style={styles.text}>
            {'refreshing...'}
          </Text>
          <ActivityIndicator size='small'
                                animating={true}/>
        </View>
      );
    },
    renderFooterInifiteIdle: (): React.Element => {
      return (
        <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
          <Image source={require('./pull_arrow.png')}
                 resizeMode={Image.resizeMode.stretch}
                 style={[styles.image, styles.imageRotate]}/>
          <Text style={styles.text}>
            {'pull up to load more...'}
          </Text>
        </View>
      );
    },
    renderFooterWillInifite: (): React.Element => {
      return (
        <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
          <Image source={require('./pull_arrow.png')}
                 resizeMode={Image.resizeMode.stretch}
                 style={styles.image}/>
          <Text style={styles.text}>
            {'release to load more...'}
          </Text>
        </View>
      );
    },
    renderFooterInifiting: (): React.Element => {
      return (
        <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
          <ActivityIndicator size='small'
                                animating={true}/>
          <Text style={styles.text}>
            {'loading...'}
          </Text>
        </View>
      );
    },
    renderFooterInifiteLoadedAll: (): React.Element => {
      return (
        <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
          <Text style={styles.text}>
            {'have loaded all data'}
          </Text>
        </View>
      );
    },
    loadedAllData: (): boolean => {
      return false;
    },
    onRefresh: () => {
      console.log("onRefresh");
    },
    onInfinite: () => {
      console.log("onInfinite");
    },
  };

  constructor(props) {
    super(props);

    this.state = {
      status: STATUS_NONE,
      isLoadedAllData: false,
    };
  }

  renderRow(text: string, sId: number, rId: number): React.Element {
    if (this.dataSource) {
      return this.props.renderEmptyRow(text);
    }
    return this.props.renderRow(text, sId, rId);
  }

  renderHeader(): ?React.Element {
    const status = this.state.status;
    if (status === STATUS_REFRESH_IDLE) {
      return this.props.renderHeaderRefreshIdle();
    } else if (status === STATUS_WILL_REFRESH) {
      return this.props.renderHeaderWillRefresh();
    } else if (status === STATUS_REFRESHING) {
      return this.props.renderHeaderRefreshing();
    }
    return false;
  }

  renderFooter(): ?React.Element {
    const status = this.state.status;
    this.footerIsRender = true;
    if (status === STATUS_INFINITE_IDLE) {
      return this.props.renderFooterInifiteIdle();
    } else if (status === STATUS_WILL_INFINITE) {
      return this.props.renderFooterWillInifite();
    } else if (status === STATUS_INFINITING) {
      return this.props.renderFooterInifiting();
    } else if (status === STATUS_INFINITE_LOADED_ALL) {
      return this.props.renderFooterInifiteLoadedAll();
    }
    this.footerIsRender = false;
    return false;
  }

  handleResponderGrant(event: *) {
    const nativeEvent = event.nativeEvent;
    if (!nativeEvent.contentInset || this.state.status!==STATUS_NONE) {
      return;
    }
    let y0 = nativeEvent.contentInset.top + nativeEvent.contentOffset.y;
    if (y0 < 0) {
      this.setState({status:STATUS_REFRESH_IDLE});
      return;
    }
    y0 = nativeEvent.contentInset.top + nativeEvent.contentOffset.y +
    nativeEvent.layoutMeasurement.height - nativeEvent.contentSize.height;
    if (y0 > 0 ) {
      if (!this.props.loadedAllData()) {
        this.initialInfiniteOffset = (y0 > 0 ? y0 : 0);
        this.setState({status:STATUS_INFINITE_IDLE});
      } else {
        this.setState({status:STATUS_INFINITE_LOADED_ALL});
      }
    }
  }

  hideHeader() {
    this.setState({status:STATUS_NONE});
  }

  hideFooter() {
    this.setState({status:STATUS_NONE});
  }

  handleResponderRelease(event: *) {
    const status = this.state.status;
    if (status === STATUS_REFRESH_IDLE) {
      this.setState({status:STATUS_NONE});
    } else if (status === STATUS_WILL_REFRESH) {
      this.setState({status:STATUS_REFRESHING});
      this.props.onRefresh();
    } else if (status === STATUS_INFINITE_IDLE) {
      this.setState({status:STATUS_NONE});
    } else if (status === STATUS_WILL_INFINITE) {
      this.setState({status:STATUS_INFINITING});
      this.props.onInfinite();
    } else if (status === STATUS_INFINITE_LOADED_ALL) {
      this.setState({status:STATUS_NONE});
    }
  }

  handleScroll(event: *) {
    const nativeEvent = event.nativeEvent;
    const status = this.state.status;
    if (status === STATUS_NONE || status === STATUS_INFINITE_LOADED_ALL ||
        status === STATUS_REFRESH_IDLE || status === STATUS_WILL_REFRESH) {
      const y = nativeEvent.contentInset.top + nativeEvent.contentOffset.y
      if (status !== STATUS_WILL_REFRESH && y < -this.props.pullDistance) {
        this.setState({status:STATUS_WILL_REFRESH});
      } else if (status === STATUS_WILL_REFRESH && y >= -this.props.pullDistance) {
        this.setState({status:STATUS_REFRESH_IDLE}, function() {
          if (this.props.maxShowTime) {
            setTimeout(function() {this.setState({status:STATUS_NONE});}.bind(this), this.props.maxShowTime);
          }
        }.bind(this));
      }
      if (status !== STATUS_NONE) {return;}
    }
    if (status === STATUS_NONE || status === STATUS_INFINITE_IDLE || status === STATUS_WILL_INFINITE) {
      if (this.props.loadedAllData()) {
        this.setState({status:STATUS_INFINITE_LOADED_ALL});
        return;
      }
      let y = nativeEvent.contentInset.top + nativeEvent.contentOffset.y + nativeEvent.layoutMeasurement.height
              - nativeEvent.contentSize.height - this.initialInfiniteOffset;
      if (this.footerIsRender) {
        y += this.props.footerHeight;
      }
      if (status!==STATUS_WILL_INFINITE && y>this.props.pullDistance) {
        this.setState({status:STATUS_WILL_INFINITE});
      } else if (status===STATUS_WILL_INFINITE && y<=this.props.pullDistance) {
        this.setState({status:STATUS_INFINITE_IDLE}, function() {
          if (this.props.maxShowTime) {
            setTimeout(function() {this.setState({status:STATUS_NONE});}.bind(this), this.props.maxShowTime);
          }
        }.bind(this));
      }
    }
  }

  scrollTo(x: Number, y: Number) {
    if (this._listView) {
      const scrollResponder = this._listView.getScrollResponder();
      if (scrollResponder) {
        scrollResponder.scrollTo(x, y);
      }
    }
  }

  getContentSize(): ?Object {
    return this.contentSize;
  }

  getFrameSize(): ?Object {
    return this.listViewSize;
  }

  _listViewSizeChanged(e: *) {
    this.listViewSize = {
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    };
  }

  _contentSizeChanged(width: Number, height: Number) {
    this.contentSize = {
      width: width,
      height: height,
    };
  }

  render(): React.Element {
    this.dataSource = null;
    if (!this.props.dataSource.getRowCount()) {
      const dataSource = new ListView.DataSource({rowHasChanged: (r1: *, r2: *): boolean => { return r1 !== r2; }});
      this.dataSource = dataSource.cloneWithRows([""]);

    }
    return (
      <ListView
        {...this.props}
        ref={(listView: *) => {this._listView = listView;}}
        onContentSizeChange={(width: Number, height: Number) => { this._contentSizeChanged(width, height); }}
        onLayout={(e: *) => { this._listViewSizeChanged(e); } }
        dataSource={this.dataSource?this.dataSource:this.props.dataSource}
        renderRow={this.renderRow.bind(this)}
        renderHeader={this.renderHeader.bind(this)}
        renderFooter={this.renderFooter.bind(this)}
        onResponderGrant={this.handleResponderGrant.bind(this)}
        onResponderRelease={this.handleResponderRelease.bind(this)}
        onScroll={this.handleScroll.bind(this)}/>
    );
  }
}

const styles = StyleSheet.create({
  text: {
    fontSize:16,
  },
  image: {
    width:40,
    height:32,
  },
  imageRotate: {
    transform:[{rotateX: '180deg'},],
  }
});

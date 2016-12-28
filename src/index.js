import React from 'react';
import classnames from 'classnames';
import fuzzysearch from 'fuzzysearch';

export class FuzzySearcher extends React.Component {
  constructor(props) {
    super();
    this.state = {
      selectedIndex: 0, // which item is selected?
      haystack: props.items, // all items that can be searched through
      items: this.getInitialItems(), // the items wich are displayed in the fuzzy find list
    };
  }

  // Move the selected index up or down.
  onMoveUp() {
    if (this.state.selectedIndex > 0) {
      this.selectIndex(--this.state.selectedIndex);

    // User is at the start of the list. Should we cycle back to the end again?
    } else if (this.props.cycleAtEndsOfList) {
      this.selectIndex(this.state.items.length-1);
    }
  }
  onMoveDown() {
    let itemsLength = this.state.items.length - 1;
    if (this.state.selectedIndex < itemsLength) {
      this.selectIndex(++this.state.selectedIndex);

    // User is at the end of the list. Should we cycle back to the start again?
    } else if (this.props.cycleAtEndsOfList) {
      this.selectIndex(0);
    }
  }

  // handle key events in the textbox
  onKeyDown(event) {
    switch (event.key) {
      // Moving up and down
      // Either arrow keys, tab/shift+tab, or ctrl+j/ctrl+k (what's used in vim sometimes)
      case 'ArrowUp': {
        this.onMoveUp();
        event.preventDefault();
        break;
      }
      case 'ArrowDown': {
        this.onMoveDown();
        event.preventDefault();
        break;
      }
      case 'j': {
        if (event.ctrlKey) {
          this.onMoveDown();
        }
        break;
      }
      case 'k': {
        if (event.ctrlKey) {
          this.onMoveUp();
        }
        break;
      }
      case 'Tab': {
        if (event.shiftKey) {
          this.onMoveUp();
        } else {
          this.onMoveDown();
        }
        event.preventDefault();
        break;
      }

      case 'Enter': { // Enter key
        let item = this.state.items[this.state.selectedIndex];
        if (item) {
          this.props.onChange(item);
        }
        break;
      }
      case 'Escape': {
        this.props.onClose();
      }
    }
  }

  getInitialItems() {
    return [];
  }

  // When the user types into the textbox, this handler is called.
  // Though the textbox is an uncontrolled input, this is needed to regenerate the
  // list of choices under the textbox.
  onInputChanged({target: {value}}) {
    if (value.length) {
      // Pick the closest matching items if possible.
      let items = this.state.haystack.filter(item => fuzzysearch(value, item));
      this.setState({items: items.slice(0, this.props.displayCount), selectedIndex: 0});
    } else {
      // initially, show an empty picker.
      this.setState({items: this.getInitialItems(), selectedIndex: 0});
    }

  }

  // Highlight the given item
  selectIndex(ct) {
    this.props.onChangeHighlightedItem(this.state.items[ct]); // fire a callback
    this.setState({selectedIndex: ct}); // update the state for real
  }

  render() {
    if (this.props.isOpen) {
      return <div className="fuzzy-switcher-background" onClick={this.props.onClose}>
        <div className="fuzzy-switcher">
          <span className="top-text">
            <span className="label">
              {this.props.label}
            </span>
            <span className="instructions">
              <span><strong>tab</strong> or <strong>↑↓</strong> to navigate</span>
              <span><strong>enter</strong> to select</span>
              <span><strong>esc</strong> to dismiss</span>
            </span>
          </span>

          <input
            type="text"
            ref={ref => ref && ref.focus()}
            onKeyDown={this.onKeyDown.bind(this)}
            onChange={this.onInputChanged.bind(this)}
          />
          <ul>
            {this.state.items.map((item, ct) => {
              // render each item
              return <li
                key={item}
                className={classnames({
                  selected: ct === this.state.selectedIndex,
                })}
                onMouseOver={this.selectIndex.bind(this, ct)}
                onClick={this.props.onChange.bind(this, this.state.items[ct])}
              >{item}</li>;
            })}
          </ul>
        </div>
      </div>;
    } else {
      return null;
    }
  }
}
FuzzySearcher.defaultProps = {
  label: 'Search', // The text above the searchbox that describes what's happening
  items: [], // Initial array of items
  displayCount: 5, // How many items to display at once
  cycleAtEndsOfList: false, // When a user arrows past the end of the list, should the highlight wrap?
  onChangeHighlightedItem(item) {}, // Called when the user highlights a new item
  onChange(item) {}, // Called when an item is selected
  onClose() {}, // Called when the popup is closed
};
export default FuzzySearcher;





export class AsyncFuzzySearcher extends FuzzySearcher {
  // Since we're fetching async, fetch the new items to show.
  onInputChanged({target: {value}}) {
    return this.props.fetchItems(content).then(items => {
      if (Array.isArray(items)) {
        this.setState({items});
      } else {
        throw new Error(`Resolved data isn't an array, and react-fuzzy-switcher expects an array to be resolved - like ["foo", "bar", "baz"]`);
      }
    });
  }
}
AsyncFuzzySearcher.defaultProps = Object.assign({}, FuzzySearcher.defaultProps, {
  // by default, don't show any items.
  fetchItems() {
    return Promise.resolve([]);
  }
});



/*
 * <FuzzyWrapper hotkey="/" popup={(onClose) => {
 *   return <FuzzySearcher onClose={onClose} (my props here...) />
 * }} />
 *
 */

export class FuzzyWrapper extends React.Component {
  constructor(props) {
    super();
    this.state = {
      isOpen: false,
    };

    // create a bound function to invoke when keys are pressed on the body.
    this.keyEvent = (function(event) {
      if (this.props.isKeyPressed(event)) {
        event.preventDefault();
        this.setState({isOpen: true});
      }
    }).bind(this);
  }
  componentDidMount() {
    document.body.addEventListener('keydown', this.keyEvent);
  }
  componentWillUnmount() {
    document.body.removeEventListener('keydown', this.keyEvent);
  }

  // Called by the containing fuzzysearcher to close itself.
  onClose() {
    this.setState({isOpen: false});
  }
  render() {
    return this.props.popup(
      this.state.isOpen,
      this.onClose.bind(this),
    );
  }
}